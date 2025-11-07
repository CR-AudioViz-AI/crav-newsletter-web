import { jwtVerify, createRemoteJWKSet, type JWTPayload } from 'jose';
import { env } from '../env';

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

export interface SSOSession {
  userId: string;
  orgId: string;
  workspaceId: string;
  role: string;
  email: string;
}

export async function verifySSOJWT(token: string): Promise<SSOSession | null> {
  if (!env.CRAV_SSO_JWKS_URL || !env.CRAV_SSO_ISSUER) {
    return null;
  }

  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(env.CRAV_SSO_JWKS_URL));
  }

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: env.CRAV_SSO_ISSUER,
      audience: 'crav.newsletter',
    });

    return {
      userId: payload.sub!,
      orgId: (payload as any).org_id,
      workspaceId: (payload as any).workspace_id,
      role: (payload as any).role,
      email: (payload as any).email,
    };
  } catch (error: unknown) {
    console.error('JWT verification failed:', error);
    return null;
  }
}
