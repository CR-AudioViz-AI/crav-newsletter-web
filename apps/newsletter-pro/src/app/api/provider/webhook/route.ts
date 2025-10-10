import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://dwglooddbagungmnapye.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, sendId, campaignId, email, timestamp, meta = {} } = body;

    console.log(`📨 Webhook received: ${type} for ${sendId}`);

    if (type === 'delivered') {
      const { error } = await supabase
        .from('sends')
        .update({ status: 'sent', updated_at: new Date().toISOString() })
        .eq('id', sendId);

      if (error) {
        console.error('Failed to update send status:', error);
      }
    }

    const { data: send } = await supabase
      .from('sends')
      .select('org_id, subscriber_id')
      .eq('id', sendId)
      .single();

    if (send) {
      const { error } = await supabase
        .from('email_events')
        .insert({
          org_id: send.org_id,
          campaign_id: campaignId,
          subscriber_id: send.subscriber_id,
          type: type === 'click' ? 'click' : type === 'open' ? 'open' : type === 'delivered' ? 'delivered' : type,
          meta,
          occurred_at: timestamp || new Date().toISOString(),
        });

      if (error) {
        console.error('Failed to insert event:', error);
      } else {
        console.log(`✅ Event recorded: ${type}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
