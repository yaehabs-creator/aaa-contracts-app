/**
 * Setup Admin User Script (Non-Interactive)
 * Creates admin@aaa.com with password Admin123!
 * 
 * Usage: node scripts/setup-admin.mjs
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing environment variables');
    console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function setupAdminUser() {
    console.log('🚀 AAA Contract Department - Admin User Setup\n');

    const email = 'admin@aaa.com';
    const password = 'Admin123!';
    const displayName = 'Admin User';

    try {
        console.log('📝 Creating admin user...');
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${password}\n`);

        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { display_name: displayName }
        });

        if (authError) {
            if (authError.message.includes('already registered')) {
                console.log('⚠️  User already exists, updating profile to admin...');

                const { data: users } = await supabase.auth.admin.listUsers();
                const existingUser = users.users.find(u => u.email === email);

                if (existingUser) {
                    const { error: updateError } = await supabase
                        .from('users')
                        .update({ role: 'admin', display_name: displayName })
                        .eq('email', email);

                    if (updateError) {
                        console.error('❌ Error updating profile:', updateError.message);
                        process.exit(1);
                    }

                    console.log('✅ User profile updated to admin role');
                    console.log('\n🎉 Setup complete!');
                    console.log(`\nSign in at: http://localhost:3000/`);
                    console.log(`Email: ${email}`);
                    console.log(`Password: ${password}`);
                    process.exit(0);
                }
            }

            console.error('❌ Error creating auth user:', authError.message);
            process.exit(1);
        }

        console.log('✅ Auth user created');

        // Wait for trigger to create profile
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Update to admin role
        const { error: updateError } = await supabase
            .from('users')
            .update({ role: 'admin', display_name: displayName })
            .eq('uid', authData.user.id);

        if (updateError) {
            console.error('❌ Error updating profile:', updateError.message);
            console.log('\nℹ️  Auth user created but profile update failed.');
            console.log('Run this SQL in Supabase:');
            console.log(`UPDATE users SET role = 'admin' WHERE email = '${email}';`);
            process.exit(1);
        }

        console.log('✅ User profile updated to admin role');

        // Verify
        const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (userData) {
            console.log('\n✅ User verified:');
            console.log(`   Email: ${userData.email}`);
            console.log(`   Display Name: ${userData.display_name}`);
            console.log(`   Role: ${userData.role}`);
        }

        console.log('\n🎉 Setup complete!');
        console.log(`\nSign in at: http://localhost:3000/`);
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);

    } catch (error) {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    }
}

setupAdminUser();
