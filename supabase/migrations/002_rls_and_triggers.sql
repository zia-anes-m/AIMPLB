-- ====================================================================
-- AIMPLB 30th Annual Session - Row Level Security (RLS) & Triggers
-- ====================================================================

-- --------------------------------------------------------------------
-- HELPER FUNCTIONS FOR RLS (Security Definer to prevent recursion)
-- --------------------------------------------------------------------

-- Function to check if the current user is active
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

-- Function to get the current user's role
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

-- Function to check if current user is Admin
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
-- AUDIT LOGGING TRIGGER
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    v_action TEXT;
    v_rec_id TEXT;
    v_prev JSONB := NULL;
    v_new JSONB := NULL;
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

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, previous_data, new_data)
    VALUES (auth.uid(), v_action, TG_TABLE_NAME, v_rec_id, v_prev, v_new);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach audit log triggers to sensitive tables
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

DROP TRIGGER IF EXISTS trg_audit_hall ON public.meeting_hall_assignments;
CREATE TRIGGER trg_audit_hall AFTER INSERT OR UPDATE OR DELETE ON public.meeting_hall_assignments FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- --------------------------------------------------------------------
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- --------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transportation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accommodations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_arrangements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reception ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_hall_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- RLS POLICIES: PROFILES
-- --------------------------------------------------------------------
-- Active users can read all active volunteer profiles
CREATE POLICY "Profiles are viewable by active authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_active_volunteer());

-- Only Admins can insert/update/delete profiles (managing volunteers)
CREATE POLICY "Only admins can insert profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.is_admin());

CREATE POLICY "Only admins can delete profiles"
ON public.profiles FOR DELETE
TO authenticated
USING (public.is_admin());

-- --------------------------------------------------------------------
-- RLS POLICIES: INVItees (Centralized module)
-- --------------------------------------------------------------------
-- All active volunteers can read all invitees
CREATE POLICY "Active volunteers can view invitees"
ON public.invitees FOR SELECT
TO authenticated
USING (public.is_active_volunteer());

-- Any active volunteer from any department can add an invitee
CREATE POLICY "Active volunteers can add invitees"
ON public.invitees FOR INSERT
TO authenticated
WITH CHECK (public.is_active_volunteer());

-- Admin and Transportation Team can update basic details (or any active volunteer if permitted)
CREATE POLICY "Authorized volunteers and admins can update invitees"
ON public.invitees FOR UPDATE
TO authenticated
USING (
    public.is_admin() OR 
    (public.is_active_volunteer() AND public.current_user_role() IN ('Transportation Team', 'Accommodation Team', 'Food Team', 'Reception Team', 'Meeting Hall Team'))
);

-- Only Admin can delete invitees
CREATE POLICY "Only admins can delete invitees"
ON public.invitees FOR DELETE
TO authenticated
USING (public.is_admin());

-- --------------------------------------------------------------------
-- RLS POLICIES: TRANSPORTATION
-- --------------------------------------------------------------------
CREATE POLICY "Active volunteers can view transportation"
ON public.transportation FOR SELECT
TO authenticated
USING (public.is_active_volunteer());

CREATE POLICY "Transportation team or admin can insert transportation"
ON public.transportation FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() OR (public.is_active_volunteer() AND public.current_user_role() = 'Transportation Team'));

CREATE POLICY "Transportation team or admin can update transportation"
ON public.transportation FOR UPDATE
TO authenticated
USING (public.is_admin() OR (public.is_active_volunteer() AND public.current_user_role() = 'Transportation Team'));

CREATE POLICY "Transportation team or admin can delete transportation"
ON public.transportation FOR DELETE
TO authenticated
USING (public.is_admin() OR (public.is_active_volunteer() AND public.current_user_role() = 'Transportation Team'));

-- --------------------------------------------------------------------
-- RLS POLICIES: ACCOMMODATIONS
-- --------------------------------------------------------------------
CREATE POLICY "Active volunteers can view accommodations"
ON public.accommodations FOR SELECT
TO authenticated
USING (public.is_active_volunteer());

CREATE POLICY "Accommodation team or admin can insert accommodations"
ON public.accommodations FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() OR (public.is_active_volunteer() AND public.current_user_role() = 'Accommodation Team'));

CREATE POLICY "Accommodation team or admin can update accommodations"
ON public.accommodations FOR UPDATE
TO authenticated
USING (public.is_admin() OR (public.is_active_volunteer() AND public.current_user_role() = 'Accommodation Team'));

CREATE POLICY "Accommodation team or admin can delete accommodations"
ON public.accommodations FOR DELETE
TO authenticated
USING (public.is_admin() OR (public.is_active_volunteer() AND public.current_user_role() = 'Accommodation Team'));

-- --------------------------------------------------------------------
-- RLS POLICIES: FOOD ARRANGEMENTS
-- --------------------------------------------------------------------
CREATE POLICY "Active volunteers can view food arrangements"
ON public.food_arrangements FOR SELECT
TO authenticated
USING (public.is_active_volunteer());

CREATE POLICY "Food team or admin can insert food arrangements"
ON public.food_arrangements FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() OR (public.is_active_volunteer() AND public.current_user_role() = 'Food Team'));

CREATE POLICY "Food team or admin can update food arrangements"
ON public.food_arrangements FOR UPDATE
TO authenticated
USING (public.is_admin() OR (public.is_active_volunteer() AND public.current_user_role() = 'Food Team'));

CREATE POLICY "Food team or admin can delete food arrangements"
ON public.food_arrangements FOR DELETE
TO authenticated
USING (public.is_admin() OR (public.is_active_volunteer() AND public.current_user_role() = 'Food Team'));

-- --------------------------------------------------------------------
-- RLS POLICIES: RECEPTION
-- --------------------------------------------------------------------
CREATE POLICY "Active volunteers can view reception records"
ON public.reception FOR SELECT
TO authenticated
USING (public.is_active_volunteer());

CREATE POLICY "Reception team or admin can insert reception"
ON public.reception FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() OR (public.is_active_volunteer() AND public.current_user_role() = 'Reception Team'));

CREATE POLICY "Reception team or admin can update reception"
ON public.reception FOR UPDATE
TO authenticated
USING (public.is_admin() OR (public.is_active_volunteer() AND public.current_user_role() = 'Reception Team'));

CREATE POLICY "Reception team or admin can delete reception"
ON public.reception FOR DELETE
TO authenticated
USING (public.is_admin() OR (public.is_active_volunteer() AND public.current_user_role() = 'Reception Team'));

-- --------------------------------------------------------------------
-- RLS POLICIES: MEETING HALL ASSIGNMENTS
-- --------------------------------------------------------------------
CREATE POLICY "Active volunteers can view meeting hall assignments"
ON public.meeting_hall_assignments FOR SELECT
TO authenticated
USING (public.is_active_volunteer());

CREATE POLICY "Meeting hall team or admin can insert hall assignments"
ON public.meeting_hall_assignments FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() OR (public.is_active_volunteer() AND public.current_user_role() = 'Meeting Hall Team'));

CREATE POLICY "Meeting hall team or admin can update hall assignments"
ON public.meeting_hall_assignments FOR UPDATE
TO authenticated
USING (public.is_admin() OR (public.is_active_volunteer() AND public.current_user_role() = 'Meeting Hall Team'));

CREATE POLICY "Meeting hall team or admin can delete hall assignments"
ON public.meeting_hall_assignments FOR DELETE
TO authenticated
USING (public.is_admin() OR (public.is_active_volunteer() AND public.current_user_role() = 'Meeting Hall Team'));

-- --------------------------------------------------------------------
-- RLS POLICIES: AUDIT LOGS
-- --------------------------------------------------------------------
-- Only Admins can view audit logs. Nobody can directly edit or delete them.
CREATE POLICY "Only admins can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.is_admin());

-- --------------------------------------------------------------------
-- RLS POLICIES: SYSTEM SETTINGS
-- --------------------------------------------------------------------
-- All active volunteers can read system settings (to populate dropdowns)
CREATE POLICY "Active volunteers can read settings"
ON public.system_settings FOR SELECT
TO authenticated
USING (public.is_active_volunteer());

-- Only Admins can insert/update settings
CREATE POLICY "Only admins can modify settings"
ON public.system_settings FOR ALL
TO authenticated
USING (public.is_admin());

