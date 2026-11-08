-- ====================================================================
-- AIMPLB 30th Annual Session - Database Schema Migration
-- Organization: All India Muslim Personal Law Board
-- Venue: Hajj House, Chennai, Tamil Nadu
-- Dates: 14, 15, 16 December 2026
-- ====================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------
-- 1. PROFILES (Volunteers & Admins linked to Supabase Auth)
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

-- Index on username and role
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- --------------------------------------------------------------------
-- 2. INVITEE CODE SEQUENCE & INVITEE TABLE
-- --------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS invitee_code_seq START WITH 1 INCREMENT BY 1;

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
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_invitees_code ON public.invitees(invitee_code);
CREATE INDEX IF NOT EXISTS idx_invitees_name ON public.invitees(full_name);
CREATE INDEX IF NOT EXISTS idx_invitees_phone ON public.invitees(phone);
CREATE INDEX IF NOT EXISTS idx_invitees_category ON public.invitees(category);

-- Trigger to auto-generate invitee_code formatted as AIM-INV-0001
CREATE OR REPLACE FUNCTION public.generate_invitee_code()
RETURNS TRIGGER AS $$
DECLARE
    next_val INT;
BEGIN
    IF NEW.invitee_code IS NULL OR NEW.invitee_code = '' THEN
        next_val := nextval('invitee_code_seq');
        NEW.invitee_code := 'AIM-INV-' || LPAD(next_val::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_invitee_code ON public.invitees;
CREATE TRIGGER trigger_generate_invitee_code
    BEFORE INSERT ON public.invitees
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_invitee_code();

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
CREATE INDEX IF NOT EXISTS idx_transport_mode ON public.transportation(transport_mode);
CREATE INDEX IF NOT EXISTS idx_transport_journey ON public.transportation(journey_type);

-- --------------------------------------------------------------------
-- 4. ACCOMMODATION TABLE
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
    remarks TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_acc_invitee ON public.accommodations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_acc_type ON public.accommodations(accommodation_type);
CREATE INDEX IF NOT EXISTS idx_acc_hotel ON public.accommodations(hotel_name);
CREATE INDEX IF NOT EXISTS idx_acc_room ON public.accommodations(room_number);
CREATE INDEX IF NOT EXISTS idx_acc_checkin ON public.accommodations(check_in_date);
CREATE INDEX IF NOT EXISTS idx_acc_checkout ON public.accommodations(check_out_date);

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
CREATE INDEX IF NOT EXISTS idx_food_preference ON public.food_arrangements(dietary_preference);

-- --------------------------------------------------------------------
-- 6. RECEPTION TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reception (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invitee_id UUID NOT NULL REFERENCES public.invitees(id) ON DELETE CASCADE,
    expected_arrival TIMESTAMPTZ,
    actual_arrival TIMESTAMPTZ,
    reception_status TEXT NOT NULL DEFAULT 'Expected' CHECK (reception_status IN (
        'Expected',
        'Arrived',
        'Received',
        'Checked In',
        'Completed'
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
-- 7. MEETING HALL ASSIGNMENTS TABLE
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
CREATE INDEX IF NOT EXISTS idx_hall_name ON public.meeting_hall_assignments(meeting_hall);
CREATE INDEX IF NOT EXISTS idx_hall_seat ON public.meeting_hall_assignments(meeting_hall, seating_section, seat_number);

-- --------------------------------------------------------------------
-- 8. AUDIT LOGS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
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

-- --------------------------------------------------------------------
-- 9. SYSTEM SETTINGS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_settings_key ON public.system_settings(setting_key);

-- --------------------------------------------------------------------
-- Updated_at Trigger for All Tables
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_timestamp BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_invitees_timestamp BEFORE UPDATE ON public.invitees FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_transport_timestamp BEFORE UPDATE ON public.transportation FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_acc_timestamp BEFORE UPDATE ON public.accommodations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_food_timestamp BEFORE UPDATE ON public.food_arrangements FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_reception_timestamp BEFORE UPDATE ON public.reception FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_hall_timestamp BEFORE UPDATE ON public.meeting_hall_assignments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_settings_timestamp BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

