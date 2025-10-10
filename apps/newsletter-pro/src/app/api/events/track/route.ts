import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { mcp__supabase__execute_sql } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { event, user_id, org_id, workspace_id, props = {} } = body;

  if (env.APP_MODE === 'dev') {
    try {
      await mcp__supabase__execute_sql({
        query: `
          INSERT INTO event_bus (org_id, event, data, created_at)
          VALUES ($1, $2, $3, NOW())
        `,
        params: [org_id || '00000000-0000-0000-0000-000000000000', event, JSON.stringify({ user_id, workspace_id, ...props })],
      });
    } catch (error) {
      console.error('Event tracking error:', error);
    }
  }

  return NextResponse.json({
    tracked: true,
    event,
    timestamp: new Date().toISOString(),
  });
}
