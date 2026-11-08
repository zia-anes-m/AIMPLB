# Supabase Setup Guide | AIMPLB 30th Annual Session

This document details the exact process to provision and connect your Supabase PostgreSQL backend for the **All India Muslim Personal Law Board (AIMPLB) 30th Annual Session** coordination system.

---

## 1. Create a Supabase Project

1. Log in to [Supabase](https://supabase.com).
2. Click **New Project**.
3. Choose your organization, project name (`aimplb-30th-session`), and database password.
4. Select the region closest to your operations (e.g., `ap-south-1` Mumbai, India).
5. Wait for the database provisioning to complete.

---

## 2. Run Database SQL Migrations

Open the **SQL Editor** in the Supabase Dashboard and run the migration scripts located in `supabase/migrations/` in order:

### Migration 1: Tables & Relational Schema
Run `supabase/migrations/001_initial_schema.sql`
- Creates `profiles`, `invitees`, `transportation`, `accommodations`, `food_arrangements`, `reception`, `meeting_hall_assignments`, `audit_logs`, `system_settings`.
- Sets up automatic Invitee Code generation (`AIM-INV-0001`, `AIM-INV-0002`).
- Establishes foreign keys, uniqueness constraints, and updated_at triggers.

### Migration 2: Row Level Security (RLS) & Triggers
Run `supabase/migrations/002_rls_and_triggers.sql`
- Enables Row Level Security on all 9 tables.
- Creates non-recursive helper functions: `is_active_volunteer()`, `current_user_role()`, `is_admin()`.
- Grants department-scoped write policies while allowing read access to centralized invitees.
- Binds audit logging triggers to capture changes and payloads into `audit_logs`.

### Migration 3: Seed Configuration Data
Run `supabase/migrations/003_seed_data.sql`
- Seeds official event details:
  - Dates: `14, 15, 16 December 2026`
  - Venue: `Hajj House, Chennai, Tamil Nadu, India`
- Populates transport drop points (Chennai International Airport Meenambakkam, Chennai Central, Egmore, Tambaram, Kilambakkam, Koyambedu).
- Populates hotel options (Ramada, Orion, Rivera, Mathi, Hajj House AC/Non-AC).
- Populates caterers and meeting hall sections.

---

## 3. Configure Environment Variables

In your project root, configure `.env`:

```bash
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

You can obtain these from Supabase Dashboard under:
**Project Settings -> API -> Project URL & Project API Keys (anon / public)**.

---

## 4. Volunteer User Accounts & Admin Setup

1. In Supabase Dashboard, go to **Authentication -> Users**.
2. Click **Add User -> Create User**:
   - Email: `admin@aimplb.org`
   - Password: Choose a strong password
   - Auto Confirm User: Checked
3. In SQL Editor, link the user to the `profiles` table:

```sql
INSERT INTO public.profiles (id, full_name, username, role, department, is_active)
VALUES (
    '<PASTE_AUTH_USER_UUID_HERE>',
    'Chief Event Coordinator',
    'admin',
    'Admin',
    'Central Secretariat',
    true
)
ON CONFLICT (id) DO UPDATE SET role = 'Admin', is_active = true;
```

---

## 5. Built-in Interactive Demo Store

If you run the application before configuring live Supabase credentials (or with `VITE_DEMO_MODE=true`), the application automatically activates its **Interactive Local Database Store**:
- Fully functional in-memory / localStorage database engine.
- Implements the exact same table schemas, constraints, and relational mappings.
- Pre-loaded with realistic delegate records (Founder Members, General Members, Special Invitees).
- Includes conflict protection for duplicate invitees, overlapping hotel rooms, and duplicate seating.
- Instant role simulation dropdown in the sidebar to test all 6 roles with zero setup friction!

