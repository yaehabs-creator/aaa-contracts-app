/**
 * Setup Admin User Script
 * Creates a test admin user in Supabase for the AAA Contract Department app
 * 
 * Usage: node scripts/setup-admin-user.js
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing environment variables');
    console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local file');
    console.error('\nYou can find the service role key in:');
    console.error('Supabase Dashboard → Settings → API → service_role key (secret)');
    process.exit(1);
}

// Create Supabase admin client (uses service role key)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function setupAdminUser() {
    console.log('🚀 AAA Contract Department - Admin User Setup\n');

    try {
        // Get user input
        const email = await question('Enter admin email (default: admin@aaa.com): ') || 'admin@aaa.com';
        const password = await question('Enter admin password (default: Admin123!): ') || 'Admin123!';
        const displayName = await question('Enter display name (default: Admin User): ') || 'Admin User';

        console.log('\n📝 Creating admin user...');

        // Step 1: Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true, // Auto-confirm email
            user_metadata: {
                display_name: displayName
            }
        });

        if (authError) {
            if (authError.message.includes('already registered')) {
                console.log('⚠️  User already exists in auth, updating profile...');

                // Get existing user
                const { data: users } = await supabase.auth.admin.listUsers();
                const existingUser = users.users.find(u => u.email === email);

                if (existingUser) {
                    // Update profile to admin
                    const { error: updateError } = await supabase
                        .from('users')
                        .update({
                            role: 'admin',
                            display_name: displayName
                        })
                        .eq('email', email);

                    if (updateError) {
                        console.error('❌ Error updating user profile:', updateError.message);
                        process.exit(1);
                    }

                    console.log('✅ User profile updated to admin role');
                    console.log('\n🎉 Setup complete!');
                    console.log(`\nYou can now sign in with:`);
                    console.log(`Email: ${email}`);
                    console.log(`Password: ${password}`);
                    console.log(`\nGo to: http://localhost:3000/`);
                    rl.close();
                    return;
                }
            }

            console.error('❌ Error creating auth user:', authError.message);
            process.exit(1);
        }

        console.log('✅ Auth user created');

        // Step 2: Wait a moment for trigger to create profile
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Step 3: Update user profile to admin role
        const { error: updateError } = await supabase
            .from('users')
            .update({
                role: 'admin',
                display_name: displayName
            })
            .eq('uid', authData.user.id);

        if (updateError) {
            console.error('❌ Error updating user profile:', updateError.message);
            console.log('ℹ️  The auth user was created but the profile update failed.');
            console.log('You can manually update the role in Supabase Dashboard:');
            console.log(`UPDATE users SET role = 'admin' WHERE email = '${email}';`);
            process.exit(1);
        }

        console.log('✅ User profile updated to admin role');

        // Step 4: Verify the user
        const { data: userData, error: verifyError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (verifyError) {
            console.error('⚠️  Could not verify user:', verifyError.message);
        } else {
            console.log('\n✅ User verified:');
            console.log(`   Email: ${userData.email}`);
            console.log(`   Display Name: ${userData.display_name}`);
            console.log(`   Role: ${userData.role}`);
        }

        console.log('\n🎉 Setup complete!');
        console.log(`\nYou can now sign in with:`);
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        console.log(`\nGo to: http://localhost:3000/`);

    } catch (error) {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    } finally {
        rl.close();
    }
}

// Run the setup
setupAdminUser();
