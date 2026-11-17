-- ====================================================================
-- AIMPLB 30th Annual Session - Concurrency Protection & Performance Optimization
-- Migration: 007_concurrency_and_performance_optimization.sql
-- ====================================================================

-- 1. DATABASE-LEVEL CONCURRENCY PROTECTION (PREVENT MULTIPLE ACTIVE GATE INs)
-- Ensures that under high concurrent scanning at multiple gates, it is impossible
-- for the same delegate to have more than one active un-exited entry.
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_event_entry
ON public.event_attendance (invitee_id)
WHERE status = 'IN' AND exit_time IS NULL;

-- 2. CASE-INSENSITIVE INDEXES FOR FAST DELEGATE LOOKUPS
CREATE INDEX IF NOT EXISTS idx_invitees_name_lower 
ON public.invitees (LOWER(full_name));

CREATE INDEX IF NOT EXISTS idx_invitees_code_upper
ON public.invitees (UPPER(invitee_code));

CREATE INDEX IF NOT EXISTS idx_profiles_username_lower
ON public.profiles (LOWER(username));

-- 3. ATOMIC GATE CHECK-IN FUNCTION (TRANSACTION-SAFE & CONCURRENCY PROTECTED)
CREATE OR REPLACE FUNCTION public.record_gate_entry(
    p_invitee_id UUID,
    p_recorded_by UUID,
    p_recorded_by_name TEXT,
    p_event_date DATE DEFAULT CURRENT_DATE,
    p_notes TEXT DEFAULT NULL,
    p_scan_mode TEXT DEFAULT 'QR_CAMERA'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invitee RECORD;
    v_active_id UUID;
    v_active_entry TIMESTAMPTZ;
    v_new_record RECORD;
BEGIN
    -- 1. Fetch only essential invitee fields with shared lock
    SELECT id, invitee_code, full_name, category, city, state
    INTO v_invitee
    FROM public.invitees
    WHERE id = p_invitee_id
    FOR SHARE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'INVITEE_NOT_FOUND', 'message', 'Invitee record not found.');
    END IF;

    -- 2. Check for active session with row lock
    SELECT id, entry_time
    INTO v_active_id, v_active_entry
    FROM public.event_attendance
    WHERE invitee_id = p_invitee_id AND status = 'IN' AND exit_time IS NULL
    FOR UPDATE;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'DUPLICATE_ENTRY',
            'message', 'Delegate is already checked IN (inside venue since ' || to_char(v_active_entry, 'HH12:MI AM') || '). Record gate exit before re-entering.',
            'invitee', row_to_json(v_invitee)
        );
    END IF;

    -- 3. Atomic insert
    INSERT INTO public.event_attendance (
        invitee_id, event_date, entry_time, status,
        entry_recorded_by, entry_recorded_by_name, entry_notes,
        scan_mode, is_corrected
    )
    VALUES (
        p_invitee_id, COALESCE(p_event_date, CURRENT_DATE), timezone('utc'::text, now()), 'IN',
        p_recorded_by, p_recorded_by_name, p_notes,
        p_scan_mode, false
    )
    RETURNING * INTO v_new_record;

    -- 4. Audit log entry
    INSERT INTO public.audit_logs (user_id, user_name, action, table_name, record_id, new_data)
    VALUES (p_recorded_by, p_recorded_by_name, 'GATE_IN', 'event_attendance', v_new_record.id::TEXT, to_jsonb(v_new_record));

    RETURN jsonb_build_object(
        'success', true,
        'record', row_to_json(v_new_record),
        'invitee', row_to_json(v_invitee)
    );
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'CONCURRENT_CONFLICT', 'message', 'Concurrent scan detected: Delegate was just checked IN at another gate.');
END;
$$;

-- 4. ATOMIC GATE CHECK-OUT FUNCTION (TRANSACTION-SAFE & CONCURRENCY PROTECTED)
CREATE OR REPLACE FUNCTION public.record_gate_exit(
    p_identifier TEXT,
    p_recorded_by UUID,
    p_recorded_by_name TEXT,
    p_notes TEXT DEFAULT NULL,
    p_scan_mode TEXT DEFAULT 'QR_CAMERA'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_inv_id UUID;
    v_invitee RECORD;
    v_active_rec RECORD;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_duration INT;
BEGIN
    -- Resolve invitee by ID, QR token, or invitee_code
    SELECT id, invitee_code, full_name, category, city, state
    INTO v_invitee
    FROM public.invitees
    WHERE id::TEXT = p_identifier
       OR qr_token = p_identifier
       OR UPPER(invitee_code) = UPPER(p_identifier)
    LIMIT 1;

    IF FOUND THEN
        v_inv_id := v_invitee.id;
    ELSE
        SELECT invitee_id INTO v_inv_id FROM public.event_attendance WHERE id::TEXT = p_identifier;
        IF v_inv_id IS NOT NULL THEN
            SELECT id, invitee_code, full_name, category, city, state INTO v_invitee FROM public.invitees WHERE id = v_inv_id;
        END IF;
    END IF;

    IF v_inv_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'NOT_FOUND', 'message', 'Delegate or scan record not found.');
    END IF;

    -- Lock active row to prevent concurrent duplicate exits
    SELECT *
    INTO v_active_rec
    FROM public.event_attendance
    WHERE invitee_id = v_inv_id AND status = 'IN' AND exit_time IS NULL
    ORDER BY entry_time DESC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'NOT_INSIDE',
            'message', 'Invalid Scan OUT: Delegate is not currently inside venue. An active gate entry (IN) must exist before recording exit.',
            'invitee', row_to_json(v_invitee)
        );
    END IF;

    v_duration := GREATEST(0, ROUND(EXTRACT(EPOCH FROM (v_now - v_active_rec.entry_time)) / 60));

    UPDATE public.event_attendance
    SET exit_time = v_now,
        status = 'OUT',
        exit_recorded_by = p_recorded_by,
        exit_recorded_by_name = p_recorded_by_name,
        exit_notes = COALESCE(p_notes, exit_notes),
        scan_mode = p_scan_mode,
        duration_minutes = v_duration,
        updated_at = v_now
    WHERE id = v_active_rec.id
    RETURNING * INTO v_active_rec;

    INSERT INTO public.audit_logs (user_id, user_name, action, table_name, record_id, new_data)
    VALUES (p_recorded_by, p_recorded_by_name, 'GATE_OUT', 'event_attendance', v_active_rec.id::TEXT, to_jsonb(v_active_rec));

    RETURN jsonb_build_object(
        'success', true,
        'record', row_to_json(v_active_rec),
        'invitee', row_to_json(v_invitee),
        'duration_minutes', v_duration
    );
END;
$$;

-- 5. SECURE USERNAME-TO-AUTH IDENTITY RESOLVER
-- Resolves a username to its registered auth email using server-side SECURITY DEFINER.
-- Does not expose emails through public table queries.
CREATE OR REPLACE FUNCTION public.resolve_username_to_auth_email(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_email TEXT;
BEGIN
    IF p_username IS NULL OR TRIM(p_username) = '' THEN
        RETURN NULL;
    END IF;

    SELECT u.email INTO v_email
    FROM public.profiles p
    JOIN auth.users u ON p.id = u.id
    WHERE LOWER(TRIM(p.username)) = LOWER(TRIM(p_username))
      AND p.is_active = true
    LIMIT 1;

    RETURN v_email;
END;
$$;

-- 6. PERMISSIONS
GRANT EXECUTE ON FUNCTION public.record_gate_entry TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_gate_exit TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_username_to_auth_email TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
