import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

export const campaignsRouter = router({
  list: protectedProcedure
    .input(z.object({ workspaceId: z.string() }).optional())
    .query(async ({ ctx, input }) => {
      const workspaceId = input?.workspaceId || ctx.session.workspaceId;

      if (!workspaceId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Workspace ID required' });
      }

      return ctx.prisma.campaign.findMany({
        where: { workspaceId },
        include: {
          createdBy: { select: { id: true, email: true, name: true } },
          analytics: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const campaign = await ctx.prisma.campaign.findUnique({
        where: { id: input.id },
        include: {
          createdBy: true,
          workspace: true,
          audience: true,
          analytics: true,
        },
      });

      if (!campaign) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      return campaign;
    }),

  create: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      name: z.string().min(1),
      subject: z.string().optional(),
      fromName: z.string().optional(),
      fromEmail: z.string().email().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.campaign.create({
        data: {
          ...input,
          createdById: ctx.session.user.id,
          status: 'DRAFT',
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      subject: z.string().optional(),
      fromName: z.string().optional(),
      fromEmail: z.string().email().optional(),
      template: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      return ctx.prisma.campaign.update({
        where: { id },
        data,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.campaign.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
