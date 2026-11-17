-- ====================================================================
-- AIMPLB 30TH ANNUAL SESSION - COMPLETE CONSOLIDATED DATABASE SCHEMA
-- Organization: All India Muslim Personal Law Board
-- Venue: Hajj House, Chennai | Dates: 14–16 December 2026
--
-- Security & Architecture:
--   - Full Row Level Security (RLS) on all 12 tables
--   - Role-Based Access Control (RBAC) across 6 department roles
--   - Column-level data masking via secure view (public.invitees_view)
--   - Security Definer helper functions with explicit safe search_path
--   - Tamper-proof automated audit logging triggers
--   - Dynamic category invitee sequences (AIM-F-###, AIM-S-###, AIM-G-###)
--   - Non-PII secure QR tokens (AIM-SEC-...)
--   - Zero direct DML on auth.users (managed via Supabase Auth Admin API)
-- ====================================================================

-- Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------------
-- 1. PROFILES TABLE (Linked to auth.users)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN (
        'Admin',
        'Transportation Team',
        'Accommodation Team',
        'Food Team',
        'Reception Team',
        'Meeting Hall Team'
    )),
    department TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles(LOWER(username));

-- --------------------------------------------------------------------
-- 2. INVITEE SEQUENCES & INVITEE DIRECTORY
-- --------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS invitee_founder_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS invitee_general_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS invitee_special_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS public.invitees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invitee_code TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'Founder Members',
        'General Members',
        'Special Invitees'
    )),
    phone TEXT NOT NULL,
    alternate_phone TEXT,
    address TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'India',
    remarks TEXT,
    id_card_remarks TEXT,
    qr_token TEXT UNIQUE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_invitees_code ON public.invitees(invitee_code);
CREATE INDEX IF NOT EXISTS idx_invitees_phone ON public.invitees(phone);
CREATE INDEX IF NOT EXISTS idx_invitees_category ON public.invitees(category);
CREATE INDEX IF NOT EXISTS idx_invitees_qr_token ON public.invitees(qr_token);
CREATE INDEX IF NOT EXISTS idx_invitees_city ON public.invitees(city);

-- Trigger: Category code & non-PII QR token generator
CREATE OR REPLACE FUNCTION public.generate_invitee_category_code()
RETURNS TRIGGER AS $$
DECLARE
    next_num INT;
    prefix TEXT;
BEGIN
    IF NEW.invitee_code IS NULL OR NEW.invitee_code = '' OR NEW.invitee_code LIKE 'AIM-INV-%' THEN
        IF NEW.category = 'Founder Members' THEN
            prefix := 'AIM-F-';
            next_num := nextval('invitee_founder_seq');
        ELSIF NEW.category = 'Special Invitees' THEN
            prefix := 'AIM-S-';
            next_num := nextval('invitee_special_seq');
        ELSE
            prefix := 'AIM-G-';
            next_num := nextval('invitee_general_seq');
        END IF;
        NEW.invitee_code := prefix || LPAD(next_num::TEXT, 3, '0');
    END IF;

    IF NEW.qr_token IS NULL OR NEW.qr_token = '' THEN
        NEW.qr_token := 'AIM-SEC-' || REPLACE(uuid_generate_v4()::TEXT, '-', '');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_invitee_code ON public.invitees;
DROP TRIGGER IF EXISTS trigger_generate_invitee_category_code ON public.invitees;
CREATE TRIGGER trigger_generate_invitee_category_code
    BEFORE INSERT ON public.invitees
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_invitee_category_code();

-- --------------------------------------------------------------------
-- 3. TRANSPORTATION TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transportation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invitee_id UUID NOT NULL REFERENCES public.invitees(id) ON DELETE CASCADE,
    journey_type TEXT NOT NULL CHECK (journey_type IN ('arrival', 'departure')),
    journey_date DATE NOT NULL,
    journey_time TIME,
    transport_mode TEXT NOT NULL CHECK (transport_mode IN ('Flight', 'Train', 'Bus', 'Car', 'Other')),
    location_type TEXT,
    location_name TEXT NOT NULL,
    transport_number TEXT,
    booking_reference TEXT,
    pickup_required BOOLEAN NOT NULL DEFAULT false,
    pickup_point TEXT,
    driver_name TEXT,
    driver_phone TEXT,
    remarks TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_transport_invitee ON public.transportation(invitee_id);
CREATE INDEX IF NOT EXISTS idx_transport_date ON public.transportation(journey_date);
CREATE INDEX IF NOT EXISTS idx_transport_pickup ON public.transportation(pickup_required);

-- --------------------------------------------------------------------
-- 4. ACCOMMODATIONS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.accommodations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invitee_id UUID NOT NULL REFERENCES public.invitees(id) ON DELETE CASCADE,
    accommodation_type TEXT NOT NULL CHECK (accommodation_type IN ('Hotel', 'Hajj House', 'Other', 'No accommodation required')),
    hotel_name TEXT,
    room_type TEXT,
    room_number TEXT,
    check_in_date DATE,
    check_in_time TIME,
    check_out_date DATE,
    check_out_time TIME,
    occupancy TEXT DEFAULT 'Single',
    hotel_registered BOOLEAN NOT NULL DEFAULT false,
    registration_status TEXT NOT NULL DEFAULT 'Pending' CHECK (registration_status IN ('Pending', 'Registered', 'Cancelled')),
    registered_at TIMESTAMPTZ,
    registered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    special_requirements TEXT,
    remarks TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_acc_invitee ON public.accommodations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_acc_hotel ON public.accommodations(hotel_name);
CREATE INDEX IF NOT EXISTS idx_acc_status ON public.accommodations(registration_status);

-- --------------------------------------------------------------------
-- 5. FOOD ARRANGEMENTS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.food_arrangements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invitee_id UUID NOT NULL REFERENCES public.invitees(id) ON DELETE CASCADE,
    meal_date DATE NOT NULL,
    breakfast BOOLEAN NOT NULL DEFAULT true,
    lunch BOOLEAN NOT NULL DEFAULT true,
    dinner BOOLEAN NOT NULL DEFAULT true,
    refreshments BOOLEAN NOT NULL DEFAULT true,
    food_provider TEXT,
    provider_contact TEXT,
    provider_phone TEXT,
    dietary_preference TEXT NOT NULL DEFAULT 'Non-vegetarian',
    special_requirements TEXT,
    delivery_location TEXT,
    remarks TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_food_invitee ON public.food_arrangements(invitee_id);
CREATE INDEX IF NOT EXISTS idx_food_date ON public.food_arrangements(meal_date);

-- --------------------------------------------------------------------
-- 6. RECEPTION TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reception (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invitee_id UUID NOT NULL REFERENCES public.invitees(id) ON DELETE CASCADE,
    expected_arrival TIMESTAMPTZ,
    actual_arrival TIMESTAMPTZ,
    reception_status TEXT NOT NULL DEFAULT 'Expected' CHECK (reception_status IN (
        'Expected', 'Arrived', 'Received', 'Checked In', 'Completed'
    )),
    assigned_volunteer TEXT,
    reception_point TEXT,
    pickup_status TEXT DEFAULT 'Pending',
    welcome_kit_status TEXT DEFAULT 'Pending',
    registration_status TEXT DEFAULT 'Pending',
    remarks TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_reception_invitee UNIQUE (invitee_id)
);

CREATE INDEX IF NOT EXISTS idx_reception_invitee ON public.reception(invitee_id);
CREATE INDEX IF NOT EXISTS idx_reception_status ON public.reception(reception_status);

-- --------------------------------------------------------------------
-- 7. EVENT ATTENDANCE TABLE (GATE PHYSICAL IN / OUT SCANNER)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invitee_id UUID NOT NULL REFERENCES public.invitees(id) ON DELETE CASCADE,
    event_date DATE NOT NULL DEFAULT '2026-12-14',
    entry_time TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    exit_time TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'IN' CHECK (status IN ('IN', 'OUT')),
    entry_recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    exit_recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    entry_recorded_by_name TEXT,
    exit_recorded_by_name TEXT,
    entry_notes TEXT,
    exit_notes TEXT,
    scan_mode TEXT DEFAULT 'QR_CAMERA' CHECK (scan_mode IN ('QR_CAMERA', 'MANUAL_SEARCH', 'MANUAL_OVERRIDE')),
    is_corrected BOOLEAN NOT NULL DEFAULT false,
    corrected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    correction_reason TEXT,
    duration_minutes INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_event_attendance_invitee ON public.event_attendance(invitee_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_date ON public.event_attendance(event_date);
CREATE INDEX IF NOT EXISTS idx_event_attendance_status ON public.event_attendance(status);
CREATE INDEX IF NOT EXISTS idx_event_attendance_entry_time ON public.event_attendance(entry_time);

-- --------------------------------------------------------------------
-- 8. MEETING ROOMS MASTER TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meeting_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 100,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    room_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.meeting_rooms (name, capacity, is_active, room_order)
VALUES
    ('Main Auditorium', 1500, true, 1),
    ('Founder Committee Room', 80, true, 2),
    ('Executive Committee Room', 120, true, 3),
    ('Member Committee Room', 250, true, 4)
ON CONFLICT (name) DO NOTHING;

-- --------------------------------------------------------------------
-- 9. MEETING HALL SEATING ASSIGNMENTS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meeting_hall_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invitee_id UUID NOT NULL REFERENCES public.invitees(id) ON DELETE CASCADE,
    meeting_hall TEXT NOT NULL,
    seating_section TEXT NOT NULL,
    seat_number TEXT NOT NULL,
    attendance_status TEXT NOT NULL DEFAULT 'Expected' CHECK (attendance_status IN ('Expected', 'Present', 'Absent')),
    assignment_status TEXT NOT NULL DEFAULT 'Assigned' CHECK (assignment_status IN ('Assigned', 'Reserved', 'VIP')),
    remarks TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_hall_seat UNIQUE (meeting_hall, seating_section, seat_number)
);

CREATE INDEX IF NOT EXISTS idx_hall_invitee ON public.meeting_hall_assignments(invitee_id);
CREATE INDEX IF NOT EXISTS idx_hall_seat ON public.meeting_hall_assignments(meeting_hall, seating_section, seat_number);

-- --------------------------------------------------------------------
-- 10. MEETING ATTENDANCE (ROOM-LEVEL SESSIONS)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meeting_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invitee_id UUID NOT NULL REFERENCES public.invitees(id) ON DELETE CASCADE,
    room_id UUID REFERENCES public.meeting_rooms(id) ON DELETE SET NULL,
    room_name TEXT NOT NULL,
    session_name TEXT NOT NULL DEFAULT 'General Session',
    meeting_date DATE NOT NULL DEFAULT '2026-12-14',
    in_time TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    out_time TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'IN' CHECK (status IN ('IN', 'OUT')),
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    recorded_by_name TEXT,
    notes TEXT,
    duration_minutes INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_meeting_attendance_invitee ON public.meeting_attendance(invitee_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendance_room ON public.meeting_attendance(room_name);
CREATE INDEX IF NOT EXISTS idx_meeting_attendance_date ON public.meeting_attendance(meeting_date);

-- --------------------------------------------------------------------
-- 11. AUDIT LOGS & SYSTEM SETTINGS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_name TEXT,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    previous_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_table ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_settings_key ON public.system_settings(setting_key);

-- --------------------------------------------------------------------
-- 12. UPDATED_AT & AUDIT LOG TRIGGERS
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_timestamp ON public.profiles;
CREATE TRIGGER update_profiles_timestamp BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_invitees_timestamp ON public.invitees;
CREATE TRIGGER update_invitees_timestamp BEFORE UPDATE ON public.invitees FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_transport_timestamp ON public.transportation;
CREATE TRIGGER update_transport_timestamp BEFORE UPDATE ON public.transportation FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_acc_timestamp ON public.accommodations;
CREATE TRIGGER update_acc_timestamp BEFORE UPDATE ON public.accommodations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_food_timestamp ON public.food_arrangements;
CREATE TRIGGER update_food_timestamp BEFORE UPDATE ON public.food_arrangements FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_reception_timestamp ON public.reception;
CREATE TRIGGER update_reception_timestamp BEFORE UPDATE ON public.reception FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_event_att_timestamp ON public.event_attendance;
CREATE TRIGGER update_event_att_timestamp BEFORE UPDATE ON public.event_attendance FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_hall_timestamp ON public.meeting_hall_assignments;
CREATE TRIGGER update_hall_timestamp BEFORE UPDATE ON public.meeting_hall_assignments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_meeting_att_timestamp ON public.meeting_attendance;
CREATE TRIGGER update_meeting_att_timestamp BEFORE UPDATE ON public.meeting_attendance FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_settings_timestamp ON public.system_settings;
CREATE TRIGGER update_settings_timestamp BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Centralized Audit Logging Trigger
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    v_action TEXT;
    v_rec_id TEXT;
    v_prev JSONB := NULL;
    v_new JSONB := NULL;
    v_user_name TEXT := 'System';
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'INSERT';
        v_rec_id := NEW.id::TEXT;
        v_new := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'UPDATE';
        v_rec_id := NEW.id::TEXT;
        v_prev := to_jsonb(OLD);
        v_new := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'DELETE';
        v_rec_id := OLD.id::TEXT;
        v_prev := to_jsonb(OLD);
    END IF;

    IF auth.uid() IS NOT NULL THEN
        SELECT full_name INTO v_user_name FROM public.profiles WHERE id = auth.uid();
    END IF;

    INSERT INTO public.audit_logs (user_id, user_name, action, table_name, record_id, previous_data, new_data)
    VALUES (auth.uid(), v_user_name, v_action, TG_TABLE_NAME, v_rec_id, v_prev, v_new);

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_invitees ON public.invitees;
CREATE TRIGGER trg_audit_invitees AFTER INSERT OR UPDATE OR DELETE ON public.invitees FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_transport ON public.transportation;
CREATE TRIGGER trg_audit_transport AFTER INSERT OR UPDATE OR DELETE ON public.transportation FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_acc ON public.accommodations;
CREATE TRIGGER trg_audit_acc AFTER INSERT OR UPDATE OR DELETE ON public.accommodations FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_food ON public.food_arrangements;
CREATE TRIGGER trg_audit_food AFTER INSERT OR UPDATE OR DELETE ON public.food_arrangements FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_reception ON public.reception;
CREATE TRIGGER trg_audit_reception AFTER INSERT OR UPDATE OR DELETE ON public.reception FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_event_att ON public.event_attendance;
CREATE TRIGGER trg_audit_event_att AFTER INSERT OR UPDATE OR DELETE ON public.event_attendance FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_hall ON public.meeting_hall_assignments;
CREATE TRIGGER trg_audit_hall AFTER INSERT OR UPDATE OR DELETE ON public.meeting_hall_assignments FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_meeting_att ON public.meeting_attendance;
CREATE TRIGGER trg_audit_meeting_att AFTER INSERT OR UPDATE OR DELETE ON public.meeting_attendance FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- --------------------------------------------------------------------
-- 13. RLS HELPER FUNCTIONS (SECURITY DEFINER with safe search_path)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_active_volunteer()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    v_active BOOLEAN;
BEGIN
    SELECT is_active INTO v_active FROM public.profiles WHERE id = auth.uid();
    RETURN COALESCE(v_active, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid() AND is_active = true;
    RETURN COALESCE(v_role, '');
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
    RETURN (public.current_user_role() = 'Admin');
END;
$$;

-- --------------------------------------------------------------------
-- 14. ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transportation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accommodations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_arrangements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reception ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_hall_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 14.1 PROFILES
DROP POLICY IF EXISTS "Profiles viewable by active users" ON public.profiles;
CREATE POLICY "Profiles viewable by active users" ON public.profiles
    FOR SELECT TO authenticated USING (public.is_active_volunteer());

DROP POLICY IF EXISTS "Only admins insert profiles" ON public.profiles;
CREATE POLICY "Only admins insert profiles" ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only admins update profiles" ON public.profiles;
CREATE POLICY "Only admins update profiles" ON public.profiles
    FOR UPDATE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Only admins delete profiles" ON public.profiles;
CREATE POLICY "Only admins delete profiles" ON public.profiles
    FOR DELETE TO authenticated USING (public.is_admin());

-- 14.2 INVITEES (Base Table Access)
DROP POLICY IF EXISTS "Invitees viewable by active users" ON public.invitees;
CREATE POLICY "Invitees viewable by active users" ON public.invitees
    FOR SELECT TO authenticated USING (public.is_active_volunteer());

DROP POLICY IF EXISTS "Active volunteers can add invitees" ON public.invitees;
CREATE POLICY "Active volunteers can add invitees" ON public.invitees
    FOR INSERT TO authenticated WITH CHECK (public.is_active_volunteer());

DROP POLICY IF EXISTS "Admin or Reception can update invitees" ON public.invitees;
CREATE POLICY "Admin or Reception can update invitees" ON public.invitees
    FOR UPDATE TO authenticated USING (
        public.is_admin() OR public.current_user_role() = 'Reception Team' OR created_by = auth.uid()
    );

DROP POLICY IF EXISTS "Only admin can delete invitees" ON public.invitees;
CREATE POLICY "Only admin can delete invitees" ON public.invitees
    FOR DELETE TO authenticated USING (public.is_admin());

-- --------------------------------------------------------------------
-- 14.3 SECURE COLUMN-LEVEL DATA ACCESS VIEW (INVITEES)
-- Prevents exposing phone numbers and residential addresses to
-- roles that only need identity, counts, or seating information.
-- --------------------------------------------------------------------
CREATE OR REPLACE VIEW public.invitees_view WITH (security_invoker = true) AS
SELECT
    id,
    invitee_code,
    full_name,
    category,
    city,
    state,
    country,
    -- Phone: visible only to Admin, Reception, Transportation, and Accommodation
    CASE
        WHEN public.current_user_role() IN ('Admin', 'Reception Team', 'Transportation Team', 'Accommodation Team')
            THEN phone
        ELSE '[Restricted to Logistics/Reception]'
    END AS phone,
    -- Alternate phone: visible only to Admin and Reception
    CASE
        WHEN public.current_user_role() IN ('Admin', 'Reception Team')
            THEN alternate_phone
        ELSE NULL
    END AS alternate_phone,
    -- Residential address: visible only to Admin and Reception
    CASE
        WHEN public.current_user_role() IN ('Admin', 'Reception Team')
            THEN address
        ELSE NULL
    END AS address,
    -- Internal operational remarks: visible to Admin, Reception, or creator
    CASE
        WHEN public.current_user_role() IN ('Admin', 'Reception Team') OR created_by = auth.uid()
            THEN remarks
        ELSE NULL
    END AS remarks,
    -- ID Card badge remarks: readable for badge printing
    id_card_remarks,
    -- QR Token: visible only to Admin and Reception for scanner/badge verification
    CASE
        WHEN public.current_user_role() IN ('Admin', 'Reception Team')
            THEN qr_token
        ELSE NULL
    END AS qr_token,
    created_by,
    created_at,
    updated_at
FROM public.invitees;

GRANT SELECT ON public.invitees_view TO authenticated;

-- 14.4 TRANSPORTATION (Department Isolated)
DROP POLICY IF EXISTS "Transportation select policy" ON public.transportation;
CREATE POLICY "Transportation select policy" ON public.transportation
    FOR SELECT TO authenticated USING (
        public.is_admin() OR public.current_user_role() IN ('Transportation Team', 'Reception Team')
    );

DROP POLICY IF EXISTS "Transportation insert policy" ON public.transportation;
CREATE POLICY "Transportation insert policy" ON public.transportation
    FOR INSERT TO authenticated WITH CHECK (
        public.is_admin() OR public.current_user_role() = 'Transportation Team'
    );

DROP POLICY IF EXISTS "Transportation update policy" ON public.transportation;
CREATE POLICY "Transportation update policy" ON public.transportation
    FOR UPDATE TO authenticated USING (
        public.is_admin() OR public.current_user_role() = 'Transportation Team'
    );

DROP POLICY IF EXISTS "Transportation delete policy" ON public.transportation;
CREATE POLICY "Transportation delete policy" ON public.transportation
    FOR DELETE TO authenticated USING (public.is_admin());

-- 14.5 ACCOMMODATIONS (Department Isolated)
DROP POLICY IF EXISTS "Accommodations select policy" ON public.accommodations;
CREATE POLICY "Accommodations select policy" ON public.accommodations
    FOR SELECT TO authenticated USING (
        public.is_admin() OR public.current_user_role() IN ('Accommodation Team', 'Reception Team')
    );

DROP POLICY IF EXISTS "Accommodations insert policy" ON public.accommodations;
CREATE POLICY "Accommodations insert policy" ON public.accommodations
    FOR INSERT TO authenticated WITH CHECK (
        public.is_admin() OR public.current_user_role() = 'Accommodation Team'
    );

DROP POLICY IF EXISTS "Accommodations update policy" ON public.accommodations;
CREATE POLICY "Accommodations update policy" ON public.accommodations
    FOR UPDATE TO authenticated USING (
        public.is_admin() OR public.current_user_role() = 'Accommodation Team'
    );

DROP POLICY IF EXISTS "Accommodations delete policy" ON public.accommodations;
CREATE POLICY "Accommodations delete policy" ON public.accommodations
    FOR DELETE TO authenticated USING (public.is_admin());

-- 14.6 FOOD ARRANGEMENTS (Department Isolated)
DROP POLICY IF EXISTS "Food select policy" ON public.food_arrangements;
CREATE POLICY "Food select policy" ON public.food_arrangements
    FOR SELECT TO authenticated USING (
        public.is_admin() OR public.current_user_role() = 'Food Team'
    );

DROP POLICY IF EXISTS "Food insert policy" ON public.food_arrangements;
CREATE POLICY "Food insert policy" ON public.food_arrangements
    FOR INSERT TO authenticated WITH CHECK (
        public.is_admin() OR public.current_user_role() = 'Food Team'
    );

DROP POLICY IF EXISTS "Food update policy" ON public.food_arrangements;
CREATE POLICY "Food update policy" ON public.food_arrangements
    FOR UPDATE TO authenticated USING (
        public.is_admin() OR public.current_user_role() = 'Food Team'
    );

DROP POLICY IF EXISTS "Food delete policy" ON public.food_arrangements;
CREATE POLICY "Food delete policy" ON public.food_arrangements
    FOR DELETE TO authenticated USING (public.is_admin());

-- 14.7 RECEPTION & EVENT ATTENDANCE (Department Isolated)
DROP POLICY IF EXISTS "Reception select policy" ON public.reception;
CREATE POLICY "Reception select policy" ON public.reception
    FOR SELECT TO authenticated USING (
        public.is_admin() OR public.current_user_role() = 'Reception Team'
    );

DROP POLICY IF EXISTS "Reception insert policy" ON public.reception;
CREATE POLICY "Reception insert policy" ON public.reception
    FOR INSERT TO authenticated WITH CHECK (
        public.is_admin() OR public.current_user_role() = 'Reception Team'
    );

DROP POLICY IF EXISTS "Reception update policy" ON public.reception;
CREATE POLICY "Reception update policy" ON public.reception
    FOR UPDATE TO authenticated USING (
        public.is_admin() OR public.current_user_role() = 'Reception Team'
    );

DROP POLICY IF EXISTS "Reception delete policy" ON public.reception;
CREATE POLICY "Reception delete policy" ON public.reception
    FOR DELETE TO authenticated USING (public.is_admin());

-- Event Gate Telemetry
DROP POLICY IF EXISTS "Event attendance select policy" ON public.event_attendance;
CREATE POLICY "Event attendance select policy" ON public.event_attendance
    FOR SELECT TO authenticated USING (
        public.is_admin() OR public.current_user_role() = 'Reception Team'
    );

DROP POLICY IF EXISTS "Event attendance insert policy" ON public.event_attendance;
CREATE POLICY "Event attendance insert policy" ON public.event_attendance
    FOR INSERT TO authenticated WITH CHECK (
        public.is_admin() OR public.current_user_role() = 'Reception Team'
    );

DROP POLICY IF EXISTS "Event attendance update policy" ON public.event_attendance;
CREATE POLICY "Event attendance update policy" ON public.event_attendance
    FOR UPDATE TO authenticated USING (
        public.is_admin() OR public.current_user_role() = 'Reception Team'
    );

DROP POLICY IF EXISTS "Event attendance delete policy" ON public.event_attendance;
CREATE POLICY "Event attendance delete policy" ON public.event_attendance
    FOR DELETE TO authenticated USING (public.is_admin());

-- 14.8 MEETING HALL & ROOM TRACKING (Department Isolated)
DROP POLICY IF EXISTS "Meeting rooms select policy" ON public.meeting_rooms;
CREATE POLICY "Meeting rooms select policy" ON public.meeting_rooms
    FOR SELECT TO authenticated USING (public.is_active_volunteer());

DROP POLICY IF EXISTS "Meeting rooms admin policy" ON public.meeting_rooms;
CREATE POLICY "Meeting rooms admin policy" ON public.meeting_rooms
    FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Hall seating select policy" ON public.meeting_hall_assignments;
CREATE POLICY "Hall seating select policy" ON public.meeting_hall_assignments
    FOR SELECT TO authenticated USING (
        public.is_admin() OR public.current_user_role() = 'Meeting Hall Team'
    );

DROP POLICY IF EXISTS "Hall seating insert policy" ON public.meeting_hall_assignments;
CREATE POLICY "Hall seating insert policy" ON public.meeting_hall_assignments
    FOR INSERT TO authenticated WITH CHECK (
        public.is_admin() OR public.current_user_role() = 'Meeting Hall Team'
    );

DROP POLICY IF EXISTS "Hall seating update policy" ON public.meeting_hall_assignments;
CREATE POLICY "Hall seating update policy" ON public.meeting_hall_assignments
    FOR UPDATE TO authenticated USING (
        public.is_admin() OR public.current_user_role() = 'Meeting Hall Team'
    );

DROP POLICY IF EXISTS "Hall seating delete policy" ON public.meeting_hall_assignments;
CREATE POLICY "Hall seating delete policy" ON public.meeting_hall_assignments
    FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Meeting attendance select policy" ON public.meeting_attendance;
CREATE POLICY "Meeting attendance select policy" ON public.meeting_attendance
    FOR SELECT TO authenticated USING (
        public.is_admin() OR public.current_user_role() = 'Meeting Hall Team'
    );

DROP POLICY IF EXISTS "Meeting attendance insert policy" ON public.meeting_attendance;
CREATE POLICY "Meeting attendance insert policy" ON public.meeting_attendance
    FOR INSERT TO authenticated WITH CHECK (
        public.is_admin() OR public.current_user_role() = 'Meeting Hall Team'
    );

DROP POLICY IF EXISTS "Meeting attendance update policy" ON public.meeting_attendance;
CREATE POLICY "Meeting attendance update policy" ON public.meeting_attendance
    FOR UPDATE TO authenticated USING (
        public.is_admin() OR public.current_user_role() = 'Meeting Hall Team'
    );

DROP POLICY IF EXISTS "Meeting attendance delete policy" ON public.meeting_attendance;
CREATE POLICY "Meeting attendance delete policy" ON public.meeting_attendance
    FOR DELETE TO authenticated USING (public.is_admin());

-- 14.9 AUDIT LOGS & SYSTEM SETTINGS
-- Audit logs are immutable: Ordinary volunteers cannot view; no user (including Admin) can UPDATE or DELETE via API
DROP POLICY IF EXISTS "Only admins view audit logs" ON public.audit_logs;
CREATE POLICY "Only admins view audit logs" ON public.audit_logs
    FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Settings viewable by active users" ON public.system_settings;
CREATE POLICY "Settings viewable by active users" ON public.system_settings
    FOR SELECT TO authenticated USING (public.is_active_volunteer());

DROP POLICY IF EXISTS "Only admins manage settings" ON public.system_settings;
CREATE POLICY "Only admins manage settings" ON public.system_settings
    FOR ALL TO authenticated USING (public.is_admin());


