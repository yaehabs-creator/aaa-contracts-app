import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or Service Role Key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  const email = 'yaehabs@gmail.com';
  const password = '1032002';
  const displayName = 'Abdelrhman Ehab';

  console.log(`Connecting to ${supabaseUrl}...`);

  // Check if user exists
  const { data: userListData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Error listing users:', listError);
    process.exit(1);
  }

  const existing = userListData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

  let userId;
  if (existing) {
    console.log(`User ${email} already exists (ID: ${existing.id}). Updating password and metadata...`);
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName, role: 'admin' }
    });
    if (error) {
      console.error('Error updating user:', error);
      process.exit(1);
    }
    userId = existing.id;
    console.log('✅ User updated successfully!');
  } else {
    console.log(`Creating user ${email} with display name "${displayName}"...`);
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName, role: 'admin' }
    });
    if (error) {
      console.error('Error creating user:', error);
      process.exit(1);
    }
    userId = data.user.id;
    console.log(`✅ User created successfully! ID: ${userId}`);
  }

  // Try creating profile in profiles table
  try {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email,
        display_name: displayName,
        role: 'admin'
      });

    if (profileError) {
      console.log(`ℹ️ Note on profiles table: ${profileError.message}`);
    } else {
      console.log('✅ Profiles table record updated successfully.');
    }
  } catch (err) {
    console.log('ℹ️ Profiles table update error:', err.message);
  }

  console.log('\n--- Credentials Summary ---');
  console.log(`Email: ${email}`);
  console.log(`Display Name: ${displayName}`);
  console.log(`Role: admin`);
  console.log(`Status: Confirmed and ready to sign in`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
