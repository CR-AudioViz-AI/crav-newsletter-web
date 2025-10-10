import { createClient } from '@supabase/supabase-js';
import { verifySESWebhookSignature, buildSNSMessageString } from './email/ses-provider';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

export interface WebhookEvent {
  type: 'delivered' | 'bounce' | 'complaint' | 'open' | 'click';
  sendId: string;
  campaignId: string;
  email: string;
  timestamp: string;
  meta?: Record<string, any>;
  providerEventId: string;
}

interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
};

export async function checkIdempotency(providerEventId: string): Promise<boolean> {
  const { data } = await supabase
    .from('idempotency_keys')
    .select('id')
    .eq('key', providerEventId)
    .maybeSingle();

  return data !== null;
}

export async function recordIdempotency(providerEventId: string): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await supabase
    .from('idempotency_keys')
    .insert({
      key: providerEventId,
      expires_at: expiresAt.toISOString(),
    });
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = DEFAULT_RETRY_OPTIONS
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < options.maxRetries - 1) {
        const delay = options.baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

export async function processWebhookEvent(event: WebhookEvent): Promise<void> {
  const isDuplicate = await checkIdempotency(event.providerEventId);

  if (isDuplicate) {
    console.log(`[Webhook] Duplicate event ${event.providerEventId}, skipping`);
    return;
  }

  await withRetry(async () => {
    if (event.type === 'delivered') {
      const { error } = await supabase
        .from('sends')
        .update({
          status: 'sent',
          updated_at: new Date().toISOString()
        })
        .eq('id', event.sendId);

      if (error) throw error;
    }

    const { data: send } = await supabase
      .from('sends')
      .select('org_id, subscriber_id')
      .eq('id', event.sendId)
      .maybeSingle();

    if (!send) {
      throw new Error(`Send ${event.sendId} not found`);
    }

    const { error: eventError } = await supabase
      .from('email_events')
      .insert({
        org_id: send.org_id,
        campaign_id: event.campaignId,
        subscriber_id: send.subscriber_id,
        type: event.type,
        meta: event.meta || {},
        occurred_at: event.timestamp,
      });

    if (eventError) throw eventError;

    if (event.type === 'bounce' || event.type === 'complaint') {
      await supabase
        .from('unsubscribes')
        .insert({
          org_id: send.org_id,
          email: event.email,
          reason: event.type === 'bounce' ? 'bounce' : 'complaint',
          source: 'webhook',
        });
    }

    await recordIdempotency(event.providerEventId);

    console.log(`[Webhook] Processed ${event.type} for ${event.sendId}`);
  });
}

export async function addToDLQ(
  event: WebhookEvent,
  error: Error
): Promise<void> {
  try {
    await supabase
      .from('event_bus')
      .insert({
        topic: 'webhook.failed',
        payload: {
          event,
          error: {
            message: error.message,
            stack: error.stack,
          },
        },
      });
  } catch (dlqError) {
    console.error('[DLQ] Failed to add to dead letter queue:', dlqError);
  }
}

export async function verifyWebhookSignature(
  body: any,
  signature: string | null,
  signingCertURL: string | null
): Promise<boolean> {
  if (!signature || !signingCertURL) {
    console.warn('[Webhook] Missing signature or cert URL');
    return false;
  }

  const message = buildSNSMessageString(body);
  return await verifySESWebhookSignature(message, signature, signingCertURL);
}

export function normalizeSESEvent(snsMessage: any): WebhookEvent | null {
  try {
    const message = typeof snsMessage.Message === 'string'
      ? JSON.parse(snsMessage.Message)
      : snsMessage.Message;

    const eventType = message.eventType || message.notificationType;
    const mail = message.mail;
    const messageId = mail?.messageId;

    if (!eventType || !messageId) {
      console.error('[Webhook] Missing eventType or messageId');
      return null;
    }

    let type: WebhookEvent['type'];
    switch (eventType.toLowerCase()) {
      case 'delivery':
        type = 'delivered';
        break;
      case 'bounce':
        type = 'bounce';
        break;
      case 'complaint':
        type = 'complaint';
        break;
      case 'open':
        type = 'open';
        break;
      case 'click':
        type = 'click';
        break;
      default:
        console.warn(`[Webhook] Unknown event type: ${eventType}`);
        return null;
    }

    const customData = mail?.headers?.find((h: any) =>
      h.name === 'X-Campaign-Data'
    );

    const metadata = customData ? JSON.parse(customData.value) : {};

    return {
      type,
      sendId: metadata.sendId || '',
      campaignId: metadata.campaignId || '',
      email: mail?.destination?.[0] || '',
      timestamp: mail?.timestamp || new Date().toISOString(),
      providerEventId: messageId,
      meta: message,
    };
  } catch (error) {
    console.error('[Webhook] Failed to normalize SES event:', error);
    return null;
  }
}
