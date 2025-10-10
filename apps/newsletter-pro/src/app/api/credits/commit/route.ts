import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

const creditStore = new Map<string, number>();

export async function POST(req: NextRequest) {
  if (env.APP_MODE !== 'dev') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const body = await req.json();
  const { auth_id, actual_amount } = body;

  const pendingKey = `pending_${auth_id}`;
  const pendingAmount = creditStore.get(pendingKey) || 0;

  creditStore.delete(pendingKey);

  return NextResponse.json({
    committed: true,
    auth_id,
    amount: actual_amount || pendingAmount,
  });
}
