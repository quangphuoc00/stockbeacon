-- This script fixes the missing user profile issue
-- Run this in your Supabase SQL Editor

-- Step 1: Create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (new.id, new.email, now(), now())
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create a trigger to automatically create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Create profiles for all existing auth users who don't have one
INSERT INTO public.users (id, email, created_at, updated_at)
SELECT 
  id, 
  email,
  created_at,
  created_at as updated_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- Step 4: Verify the fix
SELECT 
  au.email as auth_email,
  pu.email as profile_email,
  CASE 
    WHEN pu.id IS NULL THEN 'Missing Profile'
    ELSE 'Profile Exists'
  END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id;
