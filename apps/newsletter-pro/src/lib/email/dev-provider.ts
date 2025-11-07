import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { renderTemplate } from './renderer';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  sendId: string;
  campaignId: string;
}

export class DevEmailProvider {
  private outputDir = '/tmp/emails';

  constructor() {
    try {
      mkdirSync(this.outputDir, { recursive: true });
    } catch (error: unknown) {
      console.error('Failed to create email output directory:', error);
    }
  }

  async send(params: SendEmailParams): Promise<{ messageId: string }> {
    const { to, subject, html, sendId, campaignId } = params;

    const filePath = join(this.outputDir, `${sendId}.html`);

    const fullHtml = `
<!-- Email Details -->
<!-- To: ${to} -->
<!-- Subject: ${subject} -->
<!-- Send ID: ${sendId} -->
<!-- Campaign ID: ${campaignId} -->
<!-- Generated: ${new Date().toISOString()} -->

${html}
    `.trim();

    try {
      writeFileSync(filePath, fullHtml, 'utf8');
      console.log(`📧 Email written to: ${filePath}`);
    } catch (error: unknown) {
      console.error('Failed to write email file:', error);
      throw error;
    }

    this.simulateWebhooks(sendId, campaignId, to);

    return {
      messageId: `dev-${sendId}`,
    };
  }

  private simulateWebhooks(sendId: string, campaignId: string, email: string) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    setTimeout(async () => {
      try {
        await fetch(`${baseUrl}/api/provider/webhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'delivered',
            sendId,
            campaignId,
            email,
            timestamp: new Date().toISOString(),
          }),
        });
        console.log(`✅ Simulated: delivered for ${sendId}`);
      } catch (error: unknown) {
        console.error('Webhook simulation failed:', error);
      }
    }, 2000);

    if (Math.random() > 0.3) {
      setTimeout(async () => {
        try {
          await fetch(`${baseUrl}/api/provider/webhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'open',
              sendId,
              campaignId,
              email,
              timestamp: new Date().toISOString(),
              meta: {
                userAgent: 'Mozilla/5.0 (simulated)',
                ip: '127.0.0.1',
              },
            }),
          });
          console.log(`👁️  Simulated: open for ${sendId}`);
        } catch (error: unknown) {
          console.error('Webhook simulation failed:', error);
        }
      }, 4000);
    }

    if (Math.random() > 0.6) {
      setTimeout(async () => {
        try {
          await fetch(`${baseUrl}/api/provider/webhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'click',
              sendId,
              campaignId,
              email,
              timestamp: new Date().toISOString(),
              meta: {
                url: 'https://example.com',
                userAgent: 'Mozilla/5.0 (simulated)',
                ip: '127.0.0.1',
              },
            }),
          });
          console.log(`🖱️  Simulated: click for ${sendId}`);
        } catch (error: unknown) {
          console.error('Webhook simulation failed:', error);
        }
      }, 6000);
    }
  }
}

export const devEmail = new DevEmailProvider();
