import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dwglooddbagungmnapye.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('🌱 Seeding database...\n');

  const demoOrgId = '00000000-0000-0000-0000-000000000001';
  const demoWorkspaceId = '00000000-0000-0000-0000-000000000002';

  console.log('📦 Demo Org ID:', demoOrgId);
  console.log('📦 Demo Workspace ID:', demoWorkspaceId);
  console.log('');

  const demoSegmentId = '00000000-0000-0000-0000-000000000003';

  const { data: segment, error: segmentError } = await supabase
    .from('segments')
    .upsert({
      id: demoSegmentId,
      org_id: demoOrgId,
      name: 'Demo List',
      type: 'static',
      count: 0,
    }, { onConflict: 'id' })
    .select()
    .single();

  if (segmentError) {
    console.error('❌ Error creating segment:', segmentError);
  } else {
    console.log('✅ Created demo list:', demoSegmentId);
  }

  const demoContacts = [
    { email: 'alice@example.com', name: 'Alice Anderson', custom: { first_name: 'Alice', last_name: 'Anderson' } },
    { email: 'bob@example.com', name: 'Bob Brown', custom: { first_name: 'Bob', last_name: 'Brown' } },
    { email: 'carol@example.com', name: 'Carol Clark', custom: { first_name: 'Carol', last_name: 'Clark' } },
    { email: 'dave@example.com', name: 'Dave Davis', custom: { first_name: 'Dave', last_name: 'Davis' } },
    { email: 'eve@example.com', name: 'Eve Evans', custom: { first_name: 'Eve', last_name: 'Evans' } },
    { email: 'frank@example.com', name: 'Frank Fisher', custom: { first_name: 'Frank', last_name: 'Fisher' } },
    { email: 'grace@example.com', name: 'Grace Green', custom: { first_name: 'Grace', last_name: 'Green' } },
    { email: 'hank@example.com', name: 'Hank Harris', custom: { first_name: 'Hank', last_name: 'Harris' } },
    { email: 'iris@example.com', name: 'Iris Irwin', custom: { first_name: 'Iris', last_name: 'Irwin' } },
    { email: 'jack@example.com', name: 'Jack Jones', custom: { first_name: 'Jack', last_name: 'Jones' } },
  ];

  for (const contact of demoContacts) {
    const { error } = await supabase
      .from('subscribers')
      .upsert({
        org_id: demoOrgId,
        email: contact.email,
        name: contact.name,
        custom: contact.custom,
        status: 'active',
        source: 'seed',
      }, { onConflict: 'email,org_id' });

    if (!error) {
      console.log(`✅ Added contact: ${contact.email}`);
    }
  }

  const { error: updateError } = await supabase
    .from('segments')
    .update({ count: demoContacts.length })
    .eq('id', demoSegmentId);

  console.log('');
  console.log('✨ Seed complete!');
  console.log('');
  console.log('🎯 Next steps:');
  console.log('  1. Start dev server: npm run dev');
  console.log('  2. Get JWT: curl http://localhost:3000/auth/dev-token');
  console.log('  3. Create campaign at: http://localhost:3000/campaigns');
  console.log('');
  console.log('📝 Use these IDs:');
  console.log(`  Org: ${demoOrgId}`);
  console.log(`  Workspace: ${demoWorkspaceId}`);
  console.log(`  List: ${demoSegmentId}`);
}

seed().catch(console.error);
