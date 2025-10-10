import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://dwglooddbagungmnapye.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

export const listsRouter = router({
  list: publicProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ input }) => {
      const { data, error } = await supabase
        .from('segments')
        .select('*')
        .eq('org_id', input.orgId)
        .order('created_at', { ascending: false });

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      return data || [];
    }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const { data, error } = await supabase
        .from('segments')
        .select('*')
        .eq('id', input.id)
        .single();

      if (error) throw new TRPCError({ code: 'NOT_FOUND' });
      return data;
    }),

  create: publicProcedure
    .input(z.object({
      orgId: z.string(),
      name: z.string().min(1),
      type: z.enum(['static', 'rule']).default('static'),
    }))
    .mutation(async ({ input }) => {
      const { data, error } = await supabase
        .from('segments')
        .insert({
          org_id: input.orgId,
          name: input.name,
          type: input.type,
          count: 0,
        })
        .select()
        .single();

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      return data;
    }),

  importCSV: publicProcedure
    .input(z.object({
      orgId: z.string(),
      listId: z.string(),
      contacts: z.array(z.object({
        email: z.string().email(),
        name: z.string().optional(),
        customFields: z.record(z.any()).optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const { data: suppressed } = await supabase
        .from('unsubscribes')
        .select('email')
        .eq('org_id', input.orgId);

      const suppressedEmails = new Set(suppressed?.map(s => s.email.toLowerCase()) || []);

      const { data: existing } = await supabase
        .from('subscribers')
        .select('email')
        .eq('org_id', input.orgId);

      const existingEmails = new Set(existing?.map(e => e.email.toLowerCase()) || []);

      let imported = 0;
      let skipped = 0;

      for (const contact of input.contacts) {
        const emailLower = contact.email.toLowerCase();

        if (suppressedEmails.has(emailLower)) {
          skipped++;
          continue;
        }

        if (existingEmails.has(emailLower)) {
          skipped++;
          continue;
        }

        const { error } = await supabase
          .from('subscribers')
          .insert({
            org_id: input.orgId,
            email: contact.email,
            name: contact.name || null,
            custom: contact.customFields || {},
            status: 'active',
            source: 'csv_import',
          });

        if (!error) {
          imported++;
          existingEmails.add(emailLower);
        } else {
          skipped++;
        }
      }

      const { data: count } = await supabase
        .from('subscribers')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', input.orgId)
        .eq('status', 'active');

      await supabase
        .from('segments')
        .update({ count: count || 0 })
        .eq('id', input.listId);

      return { imported, skipped, total: input.contacts.length };
    }),
});
