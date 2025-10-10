import { NextRequest, NextResponse } from 'next/server';
import {
  processWebhookEvent,
  addToDLQ,
  verifyWebhookSignature,
  normalizeSESEvent,
  WebhookEvent,
} from '@/lib/webhook-processor';
import { isDevMode } from '@/lib/feature-flags';

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();

    if (!isDevMode()) {
      const signature = req.headers.get('x-amz-sns-signature');
      const certURL = req.headers.get('x-amz-sns-signing-cert-url');

      const isValid = await verifyWebhookSignature(body, signature, certURL);

      if (!isValid) {
        console.error('[Webhook] Signature verification failed');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    if (body.Type === 'SubscriptionConfirmation') {
      console.log('[Webhook] SNS subscription confirmation received');
      return NextResponse.json({ message: 'Subscription confirmed' });
    }

    let event: WebhookEvent | null;

    if (body.Type === 'Notification') {
      event = normalizeSESEvent(body);
    } else {
      event = body as WebhookEvent;
    }

    if (!event) {
      console.error('[Webhook] Failed to normalize event');
      return NextResponse.json(
        { error: 'Invalid event format' },
        { status: 400 }
      );
    }

    await processWebhookEvent(event);

    const duration = Date.now() - startTime;
    console.log(`[Webhook] Processed in ${duration}ms`);

    return NextResponse.json({ received: true, duration });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Webhook] Processing failed:', error);

    try {
      const body = await req.json();
      await addToDLQ(body, error as Error);
    } catch (dlqError) {
      console.error('[Webhook] DLQ failed:', dlqError);
    }

    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        duration,
      },
      { status: 500 }
    );
  }
}
