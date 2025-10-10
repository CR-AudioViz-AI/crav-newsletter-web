import { NextRequest, NextResponse } from 'next/server';
import { createDevToken } from '@/lib/dev-jwt';
import { env } from '@/lib/env';

export async function GET(req: NextRequest) {
  if (env.APP_MODE !== 'dev') {
    return NextResponse.json({ error: 'Dev tokens only in dev mode' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const user = searchParams.get('user') || 'demo@crav.ai';
  const org = searchParams.get('org') || 'demo-org';
  const ws = searchParams.get('ws') || 'demo-workspace';
  const role = searchParams.get('role') || 'owner';

  try {
    const token = await createDevToken(user, org, ws, role);

    return NextResponse.json({
      token,
      claims: {
        sub: user,
        email: user,
        org_id: org,
        workspace_id: ws,
        role,
      },
      usage: `Authorization: Bearer ${token}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Token generation failed' },
      { status: 500 }
    );
  }
}
