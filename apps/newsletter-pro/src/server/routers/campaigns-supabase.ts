import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { createClient } from '@supabase/supabase-js';
import { devEmail } from '@/lib/email/dev-provider';
import { renderTemplate } from '@/lib/email/renderer';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://dwglooddbagungmnapye.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

export const campaignsRouterSupabase = router({
  list: publicProcedure
    .input(z.object({ orgId: z.string() }).optional())
    .query(async ({ input }) => {
      const orgId = input?.orgId || '00000000-0000-0000-0000-000000000001';

      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

      return data || [];
    }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', input.id)
        .single();

      if (error) throw new TRPCError({ code: 'NOT_FOUND' });

      const { data: sends } = await supabase
        .from('sends')
        .select('*')
        .eq('campaign_id', input.id);

      const { data: events } = await supabase
        .from('email_events')
        .select('*')
        .eq('campaign_id', input.id);

      return {
        ...data,
        sends: sends || [],
        events: events || [],
      };
    }),

  create: publicProcedure
    .input(z.object({
      orgId: z.string(),
      title: z.string().min(1),
      brief: z.any().optional(),
    }))
    .mutation(async ({ input }) => {
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          org_id: input.orgId,
          title: input.title,
          brief: input.brief || {},
          blocks: [],
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

      return data;
    }),

  update: publicProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().optional(),
      brief: z.any().optional(),
      blocks: z.any().optional(),
      audience: z.any().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

      return data;
    }),

  schedule: publicProcedure
    .input(z.object({
      campaignId: z.string(),
      segmentId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', input.campaignId)
        .single();

      if (!campaign) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }

      const { data: subscribers } = await supabase
        .from('subscribers')
        .select('*')
        .eq('org_id', campaign.org_id)
        .eq('status', 'active');

      if (!subscribers || subscribers.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No active subscribers' });
      }

      const { data: suppressed } = await supabase
        .from('unsubscribes')
        .select('email')
        .eq('org_id', campaign.org_id);

      const suppressedEmails = new Set(suppressed?.map(s => s.email.toLowerCase()) || []);
      const activeSubscribers = subscribers.filter(s => !suppressedEmails.has(s.email.toLowerCase()));

      const creditsResponse = await fetch('http://localhost:3000/api/credits/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: campaign.org_id,
          workspace_id: campaign.org_id,
          amount: activeSubscribers.length,
          reason: `Campaign ${campaign.id}`,
        }),
      });

      const { auth_id } = await creditsResponse.json();

      const sendIds: string[] = [];

      for (const subscriber of activeSubscribers) {
        const { data: send } = await supabase
          .from('sends')
          .insert({
            org_id: campaign.org_id,
            campaign_id: campaign.id,
            subscriber_id: subscriber.id,
            status: 'queued',
          })
          .select()
          .single();

        if (send) {
          sendIds.push(send.id);

          const html = renderTemplate(
            { version: 1, blocks: campaign.blocks || [] },
            { first_name: subscriber.custom?.first_name || subscriber.name || 'there' }
          );

          setTimeout(async () => {
            try {
              await devEmail.send({
                to: subscriber.email,
                subject: campaign.brief?.subject || campaign.title,
                html,
                sendId: send.id,
                campaignId: campaign.id,
              });
            } catch (error: unknown) {
              console.error('Send failed:', error);
              await supabase
                .from('sends')
                .update({ status: 'failed', error: String(error) })
                .eq('id', send.id);
            }
          }, Math.random() * 1000);
        }
      }

      await supabase
        .from('campaigns')
        .update({ status: 'sending', schedule_at: new Date().toISOString() })
        .eq('id', campaign.id);

      setTimeout(async () => {
        await fetch('http://localhost:3000/api/credits/commit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            auth_id,
            actual_amount: sendIds.length,
          }),
        });

        await supabase
          .from('campaigns')
          .update({ status: 'sent' })
          .eq('id', campaign.id);
      }, 10000);

      return {
        scheduled: true,
        sends: sendIds.length,
        authId: auth_id,
      };
    }),
});
