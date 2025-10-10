import { cookies } from 'next/headers';
import { cache } from 'react';
import { prisma } from '../prisma';
import { verifySSOJWT } from './jwt';
import { env } from '../env';

export interface Session {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  orgId?: string;
  workspaceId?: string;
  role?: string;
}

export const getSession = cache(async (): Promise<Session | null> => {
  const authHeader = cookies().get('authorization')?.value;

  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');

    if (env.AUTH_MODE === 'sso' || env.AUTH_MODE === 'hybrid') {
      const ssoSession = await verifySSOJWT(token);
      if (ssoSession) {
        let user = await prisma.user.findUnique({
          where: { id: ssoSession.userId },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              id: ssoSession.userId,
              email: ssoSession.email,
              javariId: ssoSession.userId,
            },
          });
        }

        return {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          orgId: ssoSession.orgId,
          workspaceId: ssoSession.workspaceId,
          role: ssoSession.role,
        };
      }
    }

    if (env.AUTH_MODE === 'standalone' || env.AUTH_MODE === 'hybrid') {
      const session = await prisma.session.findUnique({
        where: { token },
        include: { user: true },
      });

      if (session && session.expiresAt > new Date()) {
        return {
          user: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
          },
        };
      }
    }
  }

  return null;
});

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}
