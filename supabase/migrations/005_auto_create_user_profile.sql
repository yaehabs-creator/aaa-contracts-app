-- Auto-create user profile when a new auth user signs up
-- This trigger runs with elevated privileges and bypasses RLS

-- Create a function that handles new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert a new profile for the user
  -- Use raw_user_meta_data to get display_name if provided during signup
  INSERT INTO public.users (uid, email, display_name, role, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'viewer',  -- Default role for new users
    EXTRACT(EPOCH FROM NOW()) * 1000  -- Timestamp in milliseconds
  )
  ON CONFLICT (uid) DO NOTHING;  -- Ignore if profile already exists
  
  RETURN NEW;
END;
$$;

-- Drop the trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, authenticated, anon, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
