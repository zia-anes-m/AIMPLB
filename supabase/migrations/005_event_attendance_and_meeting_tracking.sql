-- ====================================================================
-- AIMPLB 30th Annual Session - Event Attendance & Meeting Room Tracking
-- Migration: 005_event_attendance_and_meeting_tracking.sql
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. EXTEND ACCOMMODATIONS TABLE WITH REGISTRATION TRACKING
-- --------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'accommodations' AND column_name = 'hotel_registered') THEN
        ALTER TABLE public.accommodations ADD COLUMN hotel_registered BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'accommodations' AND column_name = 'registration_status') THEN
        ALTER TABLE public.accommodations ADD COLUMN registration_status TEXT NOT NULL DEFAULT 'Pending' CHECK (registration_status IN ('Pending', 'Registered', 'Cancelled'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'accommodations' AND column_name = 'registered_at') THEN
        ALTER TABLE public.accommodations ADD COLUMN registered_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'accommodations' AND column_name = 'registered_by') THEN
        ALTER TABLE public.accommodations ADD COLUMN registered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_accommodations_hotel_registered ON public.accommodations(hotel_registered);
CREATE INDEX IF NOT EXISTS idx_accommodations_registration_status ON public.accommodations(registration_status);


-- --------------------------------------------------------------------
-- 2. EVENT ATTENDANCE TABLE (GATE PHYSICAL IN / OUT MOVEMENT)
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
    duration_minutes INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_event_attendance_invitee ON public.event_attendance(invitee_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_date ON public.event_attendance(event_date);
CREATE INDEX IF NOT EXISTS idx_event_attendance_status ON public.event_attendance(status);
CREATE INDEX IF NOT EXISTS idx_event_attendance_entry_time ON public.event_attendance(entry_time);


-- --------------------------------------------------------------------
-- 3. MEETING ROOMS MASTER TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meeting_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_meeting_rooms_name ON public.meeting_rooms(name);
CREATE INDEX IF NOT EXISTS idx_meeting_rooms_is_active ON public.meeting_rooms(is_active);

-- Seed Official AIMPLB Meeting Rooms
INSERT INTO public.meeting_rooms (name, capacity, is_active)
VALUES
    ('Main Auditorium', 1500, true),
    ('Founder Committee Room', 80, true),
    ('Executive Committee Room', 120, true),
    ('Member Committee Room', 250, true)
ON CONFLICT (name) DO UPDATE
SET is_active = true, updated_at = timezone('utc'::text, now());


-- --------------------------------------------------------------------
-- 4. MEETING ATTENDANCE TRACKING (ROOM SESSIONS IN / OUT)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meeting_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invitee_id UUID NOT NULL REFERENCES public.invitees(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_meeting_attendance_status ON public.meeting_attendance(status);
CREATE INDEX IF NOT EXISTS idx_meeting_attendance_in_time ON public.meeting_attendance(in_time);


-- --------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------------------

-- Enable RLS
ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attendance ENABLE ROW LEVEL SECURITY;

-- EVENT ATTENDANCE POLICIES
CREATE POLICY "Active volunteers can view event attendance"
    ON public.event_attendance FOR SELECT
    USING (public.is_active_volunteer());

CREATE POLICY "Reception team and admin can record event entry"
    ON public.event_attendance FOR INSERT
    WITH CHECK (
        public.is_admin() OR
        public.current_user_role() = 'Reception Team'
    );

CREATE POLICY "Reception team and admin can update event attendance"
    ON public.event_attendance FOR UPDATE
    USING (
        public.is_admin() OR
        public.current_user_role() = 'Reception Team'
    );

CREATE POLICY "Only admin can delete event attendance"
    ON public.event_attendance FOR DELETE
    USING (public.is_admin());

-- MEETING ROOMS POLICIES
CREATE POLICY "Active volunteers can view meeting rooms"
    ON public.meeting_rooms FOR SELECT
    USING (public.is_active_volunteer());

CREATE POLICY "Only admin can insert meeting rooms"
    ON public.meeting_rooms FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "Only admin can update meeting rooms"
    ON public.meeting_rooms FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "Only admin can delete meeting rooms"
    ON public.meeting_rooms FOR DELETE
    USING (public.is_admin());

-- MEETING ATTENDANCE POLICIES
CREATE POLICY "Active volunteers can view meeting attendance"
    ON public.meeting_attendance FOR SELECT
    USING (public.is_active_volunteer());

CREATE POLICY "Meeting Hall team and admin can record room attendance"
    ON public.meeting_attendance FOR INSERT
    WITH CHECK (
        public.is_admin() OR
        public.current_user_role() = 'Meeting Hall Team'
    );

CREATE POLICY "Meeting Hall team and admin can update room attendance"
    ON public.meeting_attendance FOR UPDATE
    USING (
        public.is_admin() OR
        public.current_user_role() = 'Meeting Hall Team'
    );

CREATE POLICY "Only admin can delete meeting attendance"
    ON public.meeting_attendance FOR DELETE
    USING (public.is_admin());

