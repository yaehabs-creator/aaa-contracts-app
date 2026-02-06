import { readFileSync } from 'fs';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// Required environment variables
const requiredVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

console.log('🔍 Checking environment variables...\n');

// Check if .env.local exists
const envLocalPath = resolve(projectRoot, '.env.local');
if (!existsSync(envLocalPath)) {
  console.error('❌ Error: .env.local file not found!');
  console.error(`   Expected location: ${envLocalPath}\n`);
  console.error('💡 Solution:');
  console.error('   1. Copy .env.local.example to .env.local');
  console.error('   2. Fill in all required Firebase configuration values');
  console.error('   3. See DEPLOYMENT_GUIDE.md for detailed instructions\n');
  process.exit(1);
}

console.log('✅ .env.local file found\n');

// Read and parse .env.local
let envContent = '';
try {
  envContent = readFileSync(envLocalPath, 'utf-8');
} catch (error) {
  console.error('❌ Error reading .env.local file:', error.message);
  process.exit(1);
}

// Parse environment variables
const envVars = {};
const lines = envContent.split('\n');
lines.forEach((line, index) => {
  const trimmed = line.trim();
  // Skip comments and empty lines
  if (trimmed && !trimmed.startsWith('#')) {
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      envVars[key] = value;
    }
  }
});

// Check for missing variables
const missingVars = [];
const emptyVars = [];

requiredVars.forEach(varName => {
  if (!(varName in envVars)) {
    missingVars.push(varName);
  } else if (!envVars[varName] || envVars[varName] === 'your_' + varName.toLowerCase().replace('vite_', '').replace(/_/g, '_')) {
    emptyVars.push(varName);
  }
});

// Report results
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('');
}

if (emptyVars.length > 0) {
  console.error('⚠️  Environment variables found but appear to be empty or use placeholder values:');
  emptyVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('');
}

if (missingVars.length > 0 || emptyVars.length > 0) {
  console.error('💡 Solution:');
  console.error('   1. Open .env.local in your editor');
  console.error('   2. Ensure all required variables are set with actual values');
  console.error('   3. Get Firebase config from Firebase Console → Project Settings → Your apps');
  console.error('   4. See DEPLOYMENT_GUIDE.md for detailed setup instructions\n');
  process.exit(1);
}

// All variables present
console.log('✅ All required environment variables are present:');
requiredVars.forEach(varName => {
  const value = envVars[varName];
  const displayValue = value.length > 20 ? value.substring(0, 20) + '...' : value;
  console.log(`   ✓ ${varName} = ${displayValue}`);
});
console.log('\n✅ Environment check passed! Ready to build.\n');
