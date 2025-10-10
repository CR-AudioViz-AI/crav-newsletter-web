import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

const creditStore = new Map<string, number>();

export async function POST(req: NextRequest) {
  if (env.APP_MODE !== 'dev') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const body = await req.json();
  const { auth_id } = body;

  const pendingKey = `pending_${auth_id}`;
  creditStore.delete(pendingKey);

  return NextResponse.json({
    reverted: true,
    auth_id,
  });
}
