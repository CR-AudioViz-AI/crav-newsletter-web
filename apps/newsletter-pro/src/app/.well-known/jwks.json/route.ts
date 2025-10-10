import { NextResponse } from 'next/server';
import { getDevJWKS } from '@/lib/dev-jwt';
import { env } from '@/lib/env';

export async function GET() {
  if (env.APP_MODE !== 'dev') {
    return NextResponse.json({ error: 'JWKS only in dev mode' }, { status: 403 });
  }

  const jwks = await getDevJWKS();
  return NextResponse.json(jwks);
}
