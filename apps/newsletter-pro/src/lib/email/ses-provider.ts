import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { env } from '../env';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  metadata?: Record<string, string>;
}

export interface SendEmailResult {
  messageId: string;
  provider: 'ses';
}

let sesClient: SESClient | null = null;

function getSESClient(): SESClient {
  if (!sesClient) {
    if (!env.AWS_SES_REGION || !env.AWS_SES_ACCESS_KEY_ID || !env.AWS_SES_SECRET_ACCESS_KEY) {
      throw new Error('AWS SES credentials not configured');
    }

    sesClient = new SESClient({
      region: env.AWS_SES_REGION,
      credentials: {
        accessKeyId: env.AWS_SES_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SES_SECRET_ACCESS_KEY,
      },
    });
  }

  return sesClient;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const client = getSESClient();

  const fromEmail = params.from || process.env.SES_FROM_EMAIL || 'no-reply@newsletter.crav.io';

  const command = new SendEmailCommand({
    Source: fromEmail,
    Destination: {
      ToAddresses: [params.to],
    },
    Message: {
      Subject: {
        Data: params.subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: params.html,
          Charset: 'UTF-8',
        },
      },
    },
    ReplyToAddresses: params.replyTo ? [params.replyTo] : undefined,
    ConfigurationSetName: process.env.AWS_SES_CONFIGURATION_SET,
  });

  try {
    const response = await client.send(command);

    if (!response.MessageId) {
      throw new Error('SES did not return a MessageId');
    }

    return {
      messageId: response.MessageId,
      provider: 'ses',
    };
  } catch (error) {
    console.error('[SES] Send failed:', error);
    throw error;
  }
}

export async function verifySESWebhookSignature(
  message: string,
  signature: string,
  signingCertURL: string
): Promise<boolean> {
  try {
    const crypto = await import('crypto');
    const https = await import('https');

    const cert = await new Promise<string>((resolve, reject) => {
      https.get(signingCertURL, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(data));
        res.on('error', reject);
      });
    });

    const verifier = crypto.createVerify('SHA256');
    verifier.update(message);

    return verifier.verify(cert, signature, 'base64');
  } catch (error) {
    console.error('[SES] Signature verification failed:', error);
    return false;
  }
}

export function buildSNSMessageString(body: any): string {
  const fields = [
    'Message',
    'MessageId',
    'Subject',
    'Timestamp',
    'TopicArn',
    'Type',
  ];

  let message = '';
  for (const field of fields) {
    if (body[field] !== undefined) {
      message += field + '\n' + body[field] + '\n';
    }
  }

  return message;
}
