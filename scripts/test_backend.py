import os
import sys
import traceback
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables

# Robustly load .env.local from project root
from pathlib import Path
env_path = Path(__file__).parent.parent / '.env.local'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    print(f"WARNING: .env.local not found at {env_path}")

SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')


def test_supabase_connection():
    print('Testing Supabase connection...')
    if not SUPABASE_URL or not SUPABASE_KEY:
        print('FAIL: Missing Supabase environment variables.')
        sys.exit(1)
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        resp = supabase.table('contracts').select('*').limit(1).execute()
        print('PASS: Connected to Supabase. contracts table rows:', len(resp.data))
    except Exception as e:
        print('FAIL: Could not connect to Supabase or fetch contracts table.')
        traceback.print_exc()
        sys.exit(1)


def test_backend_status():
    print('Backend basic status: OK (Python loaded, env loaded)')


if __name__ == '__main__':
    test_backend_status()
    test_supabase_connection()
    print('All backend tests completed.')
