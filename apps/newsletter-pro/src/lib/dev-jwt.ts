import { SignJWT, generateKeyPair, exportJWK } from 'jose';
import { env } from './env';

let keypair: { publicKey: CryptoKey; privateKey: CryptoKey } | null = null;
let jwks: any = null;

export async function getDevKeypair() {
  if (!keypair) {
    keypair = await generateKeyPair('RS256');
    const publicJWK = await exportJWK(keypair.publicKey);
    jwks = {
      keys: [
        {
          ...publicJWK,
          kid: 'dev-key-1',
          alg: 'RS256',
          use: 'sig',
        },
      ],
    };
  }
  return keypair;
}

export async function getDevJWKS() {
  await getDevKeypair();
  return jwks;
}

export async function createDevToken(user: string, org: string, ws: string, role: string) {
  if (env.APP_MODE !== 'dev') {
    throw new Error('Dev tokens only available in dev mode');
  }

  const { privateKey } = await getDevKeypair();

  const jwt = await new SignJWT({
    email: user,
    org_id: org,
    workspace_id: ws,
    role,
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'dev-key-1' })
    .setIssuedAt()
    .setIssuer(env.CRAV_SSO_ISSUER || 'http://localhost:3000')
    .setAudience(env.CRAV_SSO_AUDIENCE || 'crav.newsletter')
    .setSubject(user)
    .setExpirationTime('24h')
    .sign(privateKey);

  return jwt;
}
