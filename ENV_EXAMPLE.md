# Environment Variables Example

Create a `.env.local` file in the root directory with the following variables:

## Supabase Configuration (Required)

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Firebase Configuration (Legacy - Can be removed after migration)

```env
# These are no longer needed after migrating to Supabase
# VITE_FIREBASE_API_KEY=your_firebase_api_key
# VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
# VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
# VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
# VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
# VITE_FIREBASE_APP_ID=your_firebase_app_id
```

## AI Configuration (Dual-Agent System)

The application supports a dual-agent AI system where two specialized AI experts collaborate:
- **Claude (Anthropic)**: GC/PC Specialist - Analyzes General and Particular Conditions
- **OpenAI (GPT-4)**: Document Specialist - Analyzes Agreement, BOQ, Schedules, Addendums

### Required for Claude GC/PC Expert (Conditions Analysis)

```env
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key
```

### Required for OpenAI Document Expert (Document Analysis)

```env
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_OPENAI_MODEL=gpt-4-turbo-preview  # Optional, defaults to gpt-4-turbo-preview
```

### Dual-Agent Mode

When BOTH API keys are configured:
- The system automatically enables **Dual-Agent Mode**
- Queries are intelligently routed to the appropriate specialist
- Both experts can collaborate on complex questions
- Responses show which agent(s) contributed to the answer

When only ONE API key is configured:
- The system falls back to single-agent mode using the available API
- Full functionality for that agent's specialty remains available

## How to Get API Keys

### Anthropic API Key (Claude)
1. Go to https://console.anthropic.com/
2. Create an account or sign in
3. Navigate to API Keys
4. Create a new API key → use as `VITE_ANTHROPIC_API_KEY`

### OpenAI API Key
1. Go to https://platform.openai.com/
2. Create an account or sign in
3. Navigate to API Keys
4. Create a new secret key → use as `VITE_OPENAI_API_KEY`

## How to Get Supabase Credentials

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to Settings > API
3. Copy the "Project URL" → use as `VITE_SUPABASE_URL`
4. Copy the "anon public" key → use as `VITE_SUPABASE_ANON_KEY`

## For Data Migration Scripts

If you need to run the data migration scripts, you'll also need:

```env
# For export script (Firebase Admin SDK)
FIREBASE_PROJECT_ID=your_firebase_project_id
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json

# For import script (Supabase Admin)
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**Note:** Service role key should NEVER be exposed in frontend code. Only use it in backend scripts or server-side code.
