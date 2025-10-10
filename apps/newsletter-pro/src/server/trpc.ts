import { initTRPC, TRPCError } from '@trpc/server';
import { getSession } from '../lib/auth/session';
import { prisma } from '../lib/prisma';
import superjson from 'superjson';

export const createTRPCContext = async () => {
  const session = await getSession();
  return { session, prisma };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});
