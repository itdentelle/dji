-- ==========================================
-- 1. Create User Profiles Table
-- ==========================================
-- This table stores additional user metadata and roles, linked to Supabase's auth.users table.
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  employee_id TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'qc', 'employee')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can view their own profile" 
ON public.user_profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Allow admins to manage all profiles
CREATE POLICY "Admins can manage all profiles" 
ON public.user_profiles 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ==========================================
-- 2. Create Trigger for New Users
-- ==========================================
-- Automatically create a profile entry when a new user signs up in Supabase Auth.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, employee_id, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE(new.raw_user_meta_data->>'employee_id', 'EMP-' || substr(md5(random()::text), 1, 6)),
    COALESCE(new.raw_user_meta_data->>'role', 'employee') -- Default role is employee
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind the trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- INSTRUCTIONS FOR TESTING
-- ==========================================
-- After running this script in Supabase SQL Editor:
-- 1. Go to Authentication -> Users in Supabase Dashboard.
-- 2. Add a new user manually (e.g. admin@dji.com).
-- 3. In the "User Metadata" JSON field during creation, put:
--    { "full_name": "Admin Dwiky", "employee_id": "ADM-001", "role": "admin" }
-- 4. Create another user for QC (e.g. qc@dji.com) with:
--    { "full_name": "QC Siti", "employee_id": "QC-001", "role": "qc" }
