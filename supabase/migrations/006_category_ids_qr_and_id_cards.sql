-- ====================================================================
-- AIMPLB 30th Annual Session - Category Invitee IDs, QR Tokens & ID Cards
-- Migration: 006_category_ids_qr_and_id_cards.sql
-- ====================================================================

-- 1. ADD COLUMNS FOR DEDICATED ID CARD REMARKS & SECURE QR TOKEN
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'invitees' AND column_name = 'id_card_remarks'
    ) THEN
        ALTER TABLE public.invitees ADD COLUMN id_card_remarks TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'invitees' AND column_name = 'qr_token'
    ) THEN
        ALTER TABLE public.invitees ADD COLUMN qr_token TEXT UNIQUE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_invitees_qr_token ON public.invitees(qr_token);

-- 2. CREATE CATEGORY-SPECIFIC SEQUENCES
CREATE SEQUENCE IF NOT EXISTS invitee_founder_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS invitee_general_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS invitee_special_seq START WITH 1 INCREMENT BY 1;

-- 3. FUNCTION & TRIGGER TO AUTO-GENERATE CATEGORY-BASED IDS & QR TOKENS
CREATE OR REPLACE FUNCTION public.generate_invitee_category_code()
RETURNS TRIGGER AS $$
DECLARE
    next_num INT;
    prefix TEXT;
BEGIN
    -- Determine prefix and next sequence number based on Category
    IF NEW.invitee_code IS NULL OR NEW.invitee_code = '' OR NEW.invitee_code LIKE 'AIM-INV-%' THEN
        IF NEW.category = 'Founder Members' THEN
            prefix := 'AIM-F-';
            next_num := nextval('invitee_founder_seq');
        ELSIF NEW.category = 'Special Invitees' THEN
            prefix := 'AIM-S-';
            next_num := nextval('invitee_special_seq');
        ELSE
            -- Default to General Members
            prefix := 'AIM-G-';
            next_num := nextval('invitee_general_seq');
        END IF;

        NEW.invitee_code := prefix || LPAD(next_num::TEXT, 3, '0');
    END IF;

    -- Generate secure unique QR token if missing (never exposes personal info)
    IF NEW.qr_token IS NULL OR NEW.qr_token = '' THEN
        NEW.qr_token := 'AIM-SEC-' || REPLACE(uuid_generate_v4()::TEXT, '-', '');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_invitee_code ON public.invitees;
DROP TRIGGER IF EXISTS trigger_generate_invitee_category_code ON public.invitees;

CREATE TRIGGER trigger_generate_invitee_category_code
    BEFORE INSERT OR UPDATE OF category ON public.invitees
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_invitee_category_code();

-- 4. MIGRATE EXISTING INVITEES TO CATEGORY-BASED IDS & POPULATE QR TOKENS
DO $$
DECLARE
    rec RECORD;
    f_count INT := 0;
    g_count INT := 0;
    s_count INT := 0;
    new_code TEXT;
    token TEXT;
BEGIN
    FOR rec IN SELECT id, category, invitee_code, qr_token FROM public.invitees ORDER BY created_at ASC LOOP
        IF rec.category = 'Founder Members' THEN
            f_count := f_count + 1;
            new_code := 'AIM-F-' || LPAD(f_count::TEXT, 3, '0');
        ELSIF rec.category = 'Special Invitees' THEN
            s_count := s_count + 1;
            new_code := 'AIM-S-' || LPAD(s_count::TEXT, 3, '0');
        ELSE
            g_count := g_count + 1;
            new_code := 'AIM-G-' || LPAD(g_count::TEXT, 3, '0');
        END IF;

        token := COALESCE(rec.qr_token, 'AIM-SEC-' || REPLACE(uuid_generate_v4()::TEXT, '-', ''));

        UPDATE public.invitees
        SET invitee_code = new_code,
            qr_token = token
        WHERE id = rec.id;
    END LOOP;

    -- Sync sequence values to prevent duplicate collision
    IF f_count > 0 THEN
        PERFORM setval('invitee_founder_seq', f_count);
    END IF;
    IF g_count > 0 THEN
        PERFORM setval('invitee_general_seq', g_count);
    END IF;
    IF s_count > 0 THEN
        PERFORM setval('invitee_special_seq', s_count);
    END IF;
END $$;

-- 5. EXTEND EVENT ATTENDANCE WITH SCAN MODE & AUDIT FIELDS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'event_attendance' AND column_name = 'scan_mode'
    ) THEN
        ALTER TABLE public.event_attendance ADD COLUMN scan_mode TEXT DEFAULT 'QR_CAMERA' CHECK (scan_mode IN ('QR_CAMERA', 'MANUAL_SEARCH', 'MANUAL_OVERRIDE'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'event_attendance' AND column_name = 'is_corrected'
    ) THEN
        ALTER TABLE public.event_attendance ADD COLUMN is_corrected BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'event_attendance' AND column_name = 'corrected_by'
    ) THEN
        ALTER TABLE public.event_attendance ADD COLUMN corrected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'event_attendance' AND column_name = 'correction_reason'
    ) THEN
        ALTER TABLE public.event_attendance ADD COLUMN correction_reason TEXT;
    END IF;
END $$;

-- 6. ENABLE SUPABASE REALTIME REPLICATION
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.event_attendance;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.invitees;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;

-- 7. ROW LEVEL SECURITY (RLS) POLICIES FOR GATE ATTENDANCE & IDENTIFICATION
ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;

-- Policy 1: All authenticated staff can view event attendance telemetry
DROP POLICY IF EXISTS "Authenticated users can view event attendance" ON public.event_attendance;
CREATE POLICY "Authenticated users can view event attendance"
    ON public.event_attendance FOR SELECT
    TO authenticated
    USING (true);

-- Policy 2: Reception Team and Admin can insert gate entry and exit scans
DROP POLICY IF EXISTS "Reception and Admin can record gate attendance" ON public.event_attendance;
CREATE POLICY "Reception and Admin can record gate attendance"
    ON public.event_attendance FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND (role IN ('Admin', 'Reception Team') OR department = 'Reception')
        )
    );

-- Policy 3: Only Admin and authorized Reception supervisors can correct attendance records
DROP POLICY IF EXISTS "Admin and Reception supervisors can correct attendance" ON public.event_attendance;
CREATE POLICY "Admin and Reception supervisors can correct attendance"
    ON public.event_attendance FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND (role IN ('Admin', 'Reception Team') OR department = 'Reception')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND (role IN ('Admin', 'Reception Team') OR department = 'Reception')
        )
    );

-- Policy 4: Only Admin can delete attendance records
DROP POLICY IF EXISTS "Only Admin can delete attendance records" ON public.event_attendance;
CREATE POLICY "Only Admin can delete attendance records"
    ON public.event_attendance FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

