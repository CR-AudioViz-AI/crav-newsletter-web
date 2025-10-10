import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

const templates = new Map<string, any>();

export const templatesRouter = router({
  list: publicProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ input }) => {
      const orgTemplates = Array.from(templates.values()).filter(
        t => t.orgId === input.orgId
      );
      return orgTemplates;
    }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const template = templates.get(input.id);
      if (!template) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      return template;
    }),

  create: publicProcedure
    .input(z.object({
      orgId: z.string(),
      name: z.string().min(1),
      blocks: z.any(),
      brand: z.any().optional(),
    }))
    .mutation(async ({ input }) => {
      const id = `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const template = {
        id,
        ...input,
        createdAt: new Date().toISOString(),
      };
      templates.set(id, template);
      return template;
    }),

  update: publicProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      blocks: z.any().optional(),
      brand: z.any().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      const existing = templates.get(id);
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      templates.set(id, updated);
      return updated;
    }),

  export: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const template = templates.get(input.id);
      if (!template) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      return {
        version: 1,
        blocks: template.blocks,
        brand: template.brand,
      };
    }),

  import: publicProcedure
    .input(z.object({
      orgId: z.string(),
      name: z.string(),
      template: z.object({
        version: z.number(),
        blocks: z.any(),
        brand: z.any().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const id = `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const template = {
        id,
        orgId: input.orgId,
        name: input.name,
        blocks: input.template.blocks,
        brand: input.template.brand,
        createdAt: new Date().toISOString(),
      };
      templates.set(id, template);
      return template;
    }),
});
