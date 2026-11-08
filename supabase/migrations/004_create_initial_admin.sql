-- ====================================================================
-- AIMPLB 30th Annual Session - Initial Admin & Volunteer Setup Script
-- ====================================================================
-- INSTRUCTIONS:
-- 1. In Supabase Dashboard -> Authentication -> Users, create a user:
--    Email: admin@aimplb.org (or your desired email)
--    Password: Set a strong password
--    Auto-confirm email: Checked
-- 2. Run the SQL below (replace the UUID with the generated user's id):

/*
INSERT INTO public.profiles (id, full_name, username, role, department, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000001', -- REPLACE WITH AUTH.USERS UUID
    'Chief Event Coordinator',
    'admin',
    'Admin',
    'Central Secretariat',
    true
)
ON CONFLICT (id) DO UPDATE
SET role = 'Admin', is_active = true;
*/

-- Alternatively, you can use the built-in Interactive Demo Mode in the web portal
-- to test and manage all 6 roles instantly while connecting to your Supabase instance.

