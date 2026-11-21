-- =============================================================================
-- Migration 008: Invitee Data Integrity - 10-Digit Phone & Strict Uniqueness
-- AIMPLB 30th Annual Session Volunteer Portal
-- Enforces:
-- 1. No two invitees can have the same name (case-insensitive & trimmed)
-- 2. No two invitees can have the same phone number (10-digit normalized)
-- 3. Invitee phone numbers must contain at least 10 digits
-- =============================================================================

-- 1. Function to clean and extract 10-digit phone for indexing
CREATE OR REPLACE FUNCTION public.normalize_10digit_phone(phone_input TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(RIGHT(regexp_replace(COALESCE(phone_input, ''), '\D', '', 'g'), 10), '');
$$;

-- 2. Case-Insensitive & Trimmed Unique Index on Invitee Full Name
CREATE UNIQUE INDEX IF NOT EXISTS uq_invitees_lower_trimmed_name
ON public.invitees (LOWER(TRIM(full_name)));

-- 3. Unique Index on Normalized 10-Digit Phone Number
CREATE UNIQUE INDEX IF NOT EXISTS uq_invitees_normalized_10digit_phone
ON public.invitees (public.normalize_10digit_phone(phone));

-- 4. Check Constraint: Primary Phone Number must contain at least 10 digits
ALTER TABLE public.invitees
DROP CONSTRAINT IF EXISTS chk_invitees_phone_10digits;

ALTER TABLE public.invitees
ADD CONSTRAINT chk_invitees_phone_10digits
CHECK (length(regexp_replace(phone, '\D', '', 'g')) >= 10);

-- 5. Check Constraint for Alternate Phone if provided
ALTER TABLE public.invitees
DROP CONSTRAINT IF EXISTS chk_invitees_alt_phone_10digits;

ALTER TABLE public.invitees
ADD CONSTRAINT chk_invitees_alt_phone_10digits
CHECK (
  alternate_phone IS NULL 
  OR TRIM(alternate_phone) = '' 
  OR length(regexp_replace(alternate_phone, '\D', '', 'g')) >= 10
);
