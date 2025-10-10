import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

const creditStore = new Map<string, number>();

export async function POST(req: NextRequest) {
  if (env.APP_MODE !== 'dev') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const body = await req.json();
  const { org_id, workspace_id, amount, reason } = body;

  const key = workspace_id || org_id;
  if (!creditStore.has(key)) {
    creditStore.set(key, 100000);
  }

  const currentBalance = creditStore.get(key)!;
  const authId = `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  creditStore.set(`pending_${authId}`, amount);

  return NextResponse.json({
    auth_id: authId,
    authorized_amount: amount,
    balance_after: currentBalance,
    status: 'authorized',
  });
}
