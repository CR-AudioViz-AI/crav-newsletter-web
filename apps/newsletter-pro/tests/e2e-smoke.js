#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://dwglooddbagungmnapye.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function runE2ETest() {
  console.log('🚀 Starting E2E smoke test...\n');

  const testOrgId = '00000000-0000-0000-0000-000000000001';
  const testEmail = `test-${Date.now()}@example.com`;

  try {
    console.log('✓ Step 1: Seed test contacts');
    const { data: subscribers, error: subError } = await supabase
      .from('subscribers')
      .insert([
        {
          org_id: testOrgId,
          email: testEmail,
          name: 'Test User',
          custom: { first_name: 'Test', last_name: 'User' },
          status: 'active',
          source: 'e2e_test',
        },
      ])
      .select();

    if (subError) {
      console.error('❌ Failed to insert subscriber:', subError);
      process.exit(1);
    }

    console.log(`   Inserted subscriber: ${subscribers[0].id}`);

    console.log('\n✓ Step 2: Create test campaign');
    const { data: campaign, error: campError } = await supabase
      .from('campaigns')
      .insert({
        org_id: testOrgId,
        title: 'E2E Test Campaign',
        brief: { subject: 'Test Email' },
        blocks: [
          { type: 'text', props: { content: 'Hello {{first_name}}!' } },
        ],
        status: 'draft',
      })
      .select()
      .single();

    if (campError) {
      console.error('❌ Failed to create campaign:', campError);
      process.exit(1);
    }

    console.log(`   Created campaign: ${campaign.id}`);

    console.log('\n✓ Step 3: Schedule campaign (simulated)');
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({ status: 'sending' })
      .eq('id', campaign.id);

    if (updateError) {
      console.error('❌ Failed to schedule campaign:', updateError);
      process.exit(1);
    }

    console.log('   Campaign status: sending');

    console.log('\n✓ Step 4: Insert test send');
    const { data: send, error: sendError } = await supabase
      .from('sends')
      .insert({
        org_id: testOrgId,
        campaign_id: campaign.id,
        subscriber_id: subscribers[0].id,
        status: 'sent',
      })
      .select()
      .single();

    if (sendError) {
      console.error('❌ Failed to insert send:', sendError);
      process.exit(1);
    }

    console.log(`   Created send: ${send.id}`);

    console.log('\n✓ Step 5: Record events');
    const { error: eventError } = await supabase
      .from('email_events')
      .insert([
        {
          org_id: testOrgId,
          campaign_id: campaign.id,
          subscriber_id: subscribers[0].id,
          type: 'delivered',
          occurred_at: new Date().toISOString(),
        },
        {
          org_id: testOrgId,
          campaign_id: campaign.id,
          subscriber_id: subscribers[0].id,
          type: 'open',
          occurred_at: new Date().toISOString(),
        },
      ]);

    if (eventError) {
      console.error('❌ Failed to insert events:', eventError);
      process.exit(1);
    }

    console.log('   Recorded 2 events: delivered, open');

    console.log('\n✓ Step 6: Verify events');
    const { data: events, error: eventsError } = await supabase
      .from('email_events')
      .select('*')
      .eq('campaign_id', campaign.id);

    if (eventsError) {
      console.error('❌ Failed to query events:', eventsError);
      process.exit(1);
    }

    if (events.length !== 2) {
      console.error(`❌ Expected 2 events, got ${events.length}`);
      process.exit(1);
    }

    console.log(`   Found ${events.length} events ✓`);

    console.log('\n✓ Step 7: Cleanup');
    await supabase.from('email_events').delete().eq('campaign_id', campaign.id);
    await supabase.from('sends').delete().eq('id', send.id);
    await supabase.from('campaigns').delete().eq('id', campaign.id);
    await supabase.from('subscribers').delete().eq('id', subscribers[0].id);

    console.log('   Cleaned up test data');

    console.log('\n✅ E2E smoke test PASSED\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ E2E test FAILED:', error);
    process.exit(1);
  }
}

runE2ETest();
