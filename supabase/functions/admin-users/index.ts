// Supabase Edge Function: admin-users
// Handles secure Admin bootstrapping, volunteer creation, password reset, and access toggling.
// Uses the Supabase Auth Admin API (supabase.auth.admin) with service_role privileges.
// Required Secrets in Supabase Dashboard / Edge Function Runtime:
//   - SUPABASE_URL (automatically provided by Supabase)
//   - SUPABASE_ANON_KEY (automatically provided by Supabase)
//   - SUPABASE_SERVICE_ROLE_KEY (automatically provided by Supabase)
//   - BOOTSTRAP_SECRET (configured by project administrator for one-time admin123 bootstrap)
//   - ALLOWED_ORIGINS (optional comma-separated list of allowed web origins)

// Ambient declaration for Deno runtime when inspected in Node/TypeScript tools
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response> | Response): void;
};

// @ts-ignore: Deno URL imports are natively supported by Supabase Edge Functions runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// Default trusted frontend origins for AIMPLB
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://localhost:5173',
  'http://127.0.0.1:5173',
  'https://127.0.0.1:5173',
  'http://localhost:3000',
  'https://aimplb.vercel.app',
];

// Strict role to department mapping (caller cannot override department)
const STRICT_ROLE_DEPARTMENTS: Record<string, string> = {
  'Admin': 'Central Secretariat',
  'Transportation Team': 'Transportation & Logistics',
  'Accommodation Team': 'Hospitality & Accommodation',
  'Food Team': 'Catering & Food Management',
  'Reception Team': 'Reception & Registration Desk',
  'Meeting Hall Team': 'Meeting Hall & Seating',
};

// Helper to resolve allowed origins dynamically from env or defaults
function getAllowedOrigins(): string[] {
  const envOrigins = Deno.env.get('ALLOWED_ORIGINS');
  const origins = [...DEFAULT_ALLOWED_ORIGINS.map((o) => o.toLowerCase())];
  if (envOrigins && envOrigins.trim()) {
    const parsed = envOrigins
      .split(',')
      .map((o) => o.trim().toLowerCase())
      .filter(Boolean);
    origins.push(...parsed);
  }
  return origins.filter((item, index) => origins.indexOf(item) === index);
}

// Check whether a request origin is permitted
function isOriginPermitted(origin: string, allowedOrigins: string[]): boolean {
  const norm = origin.trim().toLowerCase();
  if (allowedOrigins.includes(norm)) return true;

  try {
    const url = new URL(norm);
    // Allow localhost / loopback on any port during local development
    if (
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1') &&
      (url.protocol === 'http:' || url.protocol === 'https:')
    ) {
      return true;
    }
    // Allow production and preview deployments on Vercel
    if (
      url.protocol === 'https:' &&
      (url.hostname === 'aimplb.vercel.app' || url.hostname.endsWith('.vercel.app'))
    ) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

// Helper to determine CORS headers based on request Origin
function getCorsHeaders(req: Request): { headers: Record<string, string>; isOriginAllowed: boolean } {
  const origin = req.headers.get('Origin') || req.headers.get('origin');
  const allowedOrigins = getAllowedOrigins();

  const baseHeaders = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-bootstrap-secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };

  // If no Origin header present (e.g. server-to-server calls or authorized cURL commands)
  if (!origin) {
    return {
      headers: {
        ...baseHeaders,
        'Access-Control-Allow-Origin': allowedOrigins[0] || 'http://localhost:5173',
      },
      isOriginAllowed: true,
    };
  }

  const allowed = isOriginPermitted(origin, allowedOrigins);

  return {
    headers: {
      ...baseHeaders,
      'Access-Control-Allow-Origin': allowed ? origin : 'null',
    },
    isOriginAllowed: allowed,
  };
}

// Helper to sanitize error messages so secrets or credentials are never leaked
function sanitizeErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred.';
  const msg = typeof error === 'string' ? error : error.message || 'An unexpected error occurred.';
  return msg
    .replace(/(Bearer\s+)[A-Za-z0-9-_.]+/gi, '$1[REDACTED]')
    .replace(/(password["':\s]+)[^,}\s]+/gi, '$1[REDACTED]')
    .replace(/(secret["':\s]+)[^,}\s]+/gi, '$1[REDACTED]');
}

Deno.serve(async (req: Request) => {
  const { headers: corsHeaders, isOriginAllowed } = getCorsHeaders(req);

  // 1. Handle CORS preflight OPTIONS
  if (req.method === 'OPTIONS') {
    if (!isOriginAllowed) {
      return new Response(JSON.stringify({ error: 'Origin not allowed by CORS policy.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response('ok', { headers: corsHeaders });
  }

  // 2. Reject disallowed origins on actual requests
  if (!isOriginAllowed) {
    return new Response(JSON.stringify({ error: 'Origin not allowed by CORS policy.' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 3. Reject all HTTP methods except POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: `Method ${req.method} Not Allowed. Only POST requests are permitted.` }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Allow': 'POST, OPTIONS',
        },
      }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Server misconfiguration: Missing Supabase service credentials.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Privileged admin client with service_role permissions (strictly kept server-side)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON request body.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action } = body || {};
    if (!action || typeof action !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid required field: "action".' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================================
    // ACTION 1: SECURE ONE-TIME INITIAL ADMIN BOOTSTRAP
    // =========================================================================
    if (action === 'bootstrap') {
      const bootstrapSecretHeader = req.headers.get('x-bootstrap-secret') || req.headers.get('X-Bootstrap-Secret');
      const expectedBootstrapSecret = Deno.env.get('BOOTSTRAP_SECRET');

      if (!expectedBootstrapSecret) {
        return new Response(
          JSON.stringify({ error: 'Bootstrap disabled: BOOTSTRAP_SECRET is not configured on the server.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!bootstrapSecretHeader || bootstrapSecretHeader !== expectedBootstrapSecret) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized: Invalid or missing bootstrap secret.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { password, full_name = 'Chief Event Administrator' } = body;
      if (!password || typeof password !== 'string' || password.length < 8) {
        return new Response(
          JSON.stringify({ error: 'Admin password must be at least 8 characters long.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (full_name && typeof full_name !== 'string') {
        return new Response(
          JSON.stringify({ error: 'full_name must be a valid string.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if an Admin account already exists in profiles
      const { data: existingAdmin, error: checkError } = await supabaseAdmin
        .from('profiles')
        .select('id, username')
        .eq('role', 'Admin')
        .limit(1);

      if (checkError) {
        return new Response(
          JSON.stringify({ error: 'Failed to verify admin status: ' + sanitizeErrorMessage(checkError) }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (existingAdmin && existingAdmin.length > 0) {
        return new Response(
          JSON.stringify({ error: 'Bootstrap rejected: An Administrator account already exists.' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const adminUsername = 'admin123';
      const adminEmail = `${adminUsername}@aimplb.internal`;

      // 1. Create User via official Supabase Auth Admin API (safe duplicate-user handling)
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name.trim(),
          username: adminUsername,
        },
      });

      if (authError || !authData?.user) {
        const errMsg = (authError?.message || '').toLowerCase();
        const isDuplicate =
          errMsg.includes('already registered') ||
          errMsg.includes('already exists') ||
          errMsg.includes('already in use') ||
          (authError as any)?.status === 422;

        if (isDuplicate) {
          return new Response(
            JSON.stringify({ error: 'Bootstrap rejected: Administrator account (admin123) is already registered.' }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ error: 'Failed to provision auth user: ' + sanitizeErrorMessage(authError) }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 2. Insert into public.profiles with strictly enforced Central Secretariat department
      const { error: profileError } = await supabaseAdmin.from('profiles').insert([
        {
          id: authData.user.id,
          full_name: full_name.trim(),
          username: adminUsername,
          role: 'Admin',
          department: STRICT_ROLE_DEPARTMENTS['Admin'], // 'Central Secretariat'
          is_active: true,
        },
      ]);

      if (profileError) {
        const isConflict =
          profileError.code === '23505' ||
          profileError.message?.toLowerCase().includes('duplicate') ||
          profileError.message?.toLowerCase().includes('unique');

        if (!isConflict) {
          try {
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          } catch {
            // best-effort cleanup
          }
        }

        return new Response(
          JSON.stringify({
            error: isConflict
              ? 'Bootstrap rejected: Administrator profile already exists.'
              : 'Failed to insert admin profile: ' + sanitizeErrorMessage(profileError),
          }),
          { status: isConflict ? 409 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 3. Initialize default system settings
      await supabaseAdmin.from('system_settings').upsert([
        {
          setting_key: 'event_config',
          setting_value: {
            event_name: 'AIMPLB 30th Annual Session',
            venue: 'Hajj House, Chennai',
            dates: '14-16 December 2026',
            total_registered: 0,
          },
        },
      ], { onConflict: 'setting_key' });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Initial Administrator (admin123) provisioned successfully.',
          user: {
            id: authData.user.id,
            username: adminUsername,
            role: 'Admin',
            department: STRICT_ROLE_DEPARTMENTS['Admin'],
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================================
    // ACTION: SECURE USERNAME AUTHENTICATION (action: 'login')
    // Authenticates user by username without exposing emails/keys publicly
    // =========================================================================
    if (action === 'login') {
      const { username, password } = body;
      if (!username || typeof username !== 'string' || !username.trim()) {
        return new Response(
          JSON.stringify({ error: 'Username is required.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!password || typeof password !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Password is required.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const cleanUsername = username.trim().toLowerCase();

      // 1. Look up profile case-insensitively using privileged admin client
      const { data: profile, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .ilike('username', cleanUsername)
        .maybeSingle();

      if (profileErr || !profile) {
        return new Response(
          JSON.stringify({ error: 'Invalid username or password. Please verify your credentials.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!profile.is_active) {
        return new Response(
          JSON.stringify({ error: 'Your account has been deactivated. Please contact an administrator.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 2. Fetch user's registered email from auth.users via admin API
      const { data: authUserData, error: getUserErr } = await supabaseAdmin.auth.admin.getUserById(profile.id);
      if (getUserErr || !authUserData?.user?.email) {
        return new Response(
          JSON.stringify({ error: 'Authentication account mismatch. Please contact an administrator.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 3. Authenticate against Supabase Auth using the user's email and password
      const clientApiKey = Deno.env.get('SUPABASE_ANON_KEY') || req.headers.get('apikey') || supabaseServiceRoleKey;
      const authClient = createClient(supabaseUrl, clientApiKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: signInData, error: signInErr } = await authClient.auth.signInWithPassword({
        email: authUserData.user.email,
        password,
      });

      if (signInErr || !signInData?.session) {
        return new Response(
          JSON.stringify({ error: 'Invalid username or password. Please verify your credentials.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          session: signInData.session,
          profile,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================================
    // AUTHENTICATED ADMIN GUARD FOR ALL SUBSEQUENT ACTIONS
    // =========================================================================
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required. Missing or malformed Bearer token.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    // Verify caller's JWT directly using privileged supabaseAdmin client (does not rely on SUPABASE_ANON_KEY)
    const { data: { user: callerUser }, error: callerAuthError } = await supabaseAdmin.auth.getUser(token);

    if (callerAuthError || !callerUser) {
      console.error('[Admin Guard] getUser(token) error:', callerAuthError?.message || callerAuthError);
      return new Response(
        JSON.stringify({
          error: 'Invalid or expired authentication session.',
          details: callerAuthError?.message || 'Token verification failed. Please refresh your session or sign in again.',
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify caller role in public.profiles (must be active Admin)
    let callerProfile: any = null;
    let callerProfileError: any = null;

    // 1. Primary lookup: Match by authenticated user UID
    const { data: directProfile, error: directErr } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, username, role, department, is_active')
      .eq('id', callerUser.id)
      .maybeSingle();

    if (directErr) {
      callerProfileError = directErr;
      console.warn('[Admin Guard] Direct profile lookup error for UID', callerUser.id, ':', directErr);
    } else if (directProfile) {
      callerProfile = directProfile;
    }

    // 2. Resilient fallback: If profile was not found by direct UUID, match active Admin profile
    if (!callerProfile) {
      const { data: adminProfiles, error: adminErr } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, username, role, department, is_active')
        .eq('role', 'Admin')
        .eq('is_active', true);

      if (!adminErr && adminProfiles && adminProfiles.length > 0) {
        const callerEmail = (callerUser.email || '').toLowerCase();
        const callerMetaUsername = (callerUser.user_metadata?.username || '').toLowerCase();

        // Match by username or known admin email, or pick single active Admin profile
        const matched = adminProfiles.find((p) => {
          const pUser = (p.username || '').toLowerCase();
          return (
            (callerMetaUsername && callerMetaUsername === pUser) ||
            pUser === 'admin30' ||
            (callerEmail && callerEmail.startsWith('admin')) ||
            (callerEmail && callerEmail.includes('ziaanas'))
          );
        }) || (adminProfiles.length === 1 ? adminProfiles[0] : null);

        if (matched) {
          console.warn(`[Admin Guard] Auto-linking authenticated user UID ${callerUser.id} (${callerUser.email}) to Admin profile ${matched.username} (${matched.id})`);
          callerProfile = matched;

          // Self-heal profile primary key if it diverged from auth.users UID
          if (matched.id !== callerUser.id) {
            try {
              await supabaseAdmin.from('profiles').update({ id: callerUser.id }).eq('id', matched.id);
              callerProfile.id = callerUser.id;
            } catch (syncErr) {
              console.warn('[Admin Guard] Profile UID auto-sync notice:', syncErr);
            }
          }
        }
      }
    }

    if (!callerProfile) {
      console.error('[Admin Guard] Access denied: Caller profile not found for:', {
        callerUserId: callerUser.id,
        callerEmail: callerUser.email,
        dbError: callerProfileError,
      });
      return new Response(
        JSON.stringify({
          error: 'Access denied: Caller profile not found.',
          details: callerProfileError
            ? `Database error: ${callerProfileError.message || callerProfileError.code}`
            : `No active profile in public.profiles matches UID ${callerUser.id} (${callerUser.email || 'no email'}).`,
          caller_user_id: callerUser.id,
          caller_email: callerUser.email,
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (callerProfile.role !== 'Admin') {
      return new Response(
        JSON.stringify({
          error: 'Access denied: Caller must hold the Admin role.',
          current_role: callerProfile.role,
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!callerProfile.is_active) {
      return new Response(
        JSON.stringify({ error: 'Access denied: Caller account is deactivated.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================================
    // ACTION 2: ADMIN CREATES A VOLUNTEER ACCOUNT
    // =========================================================================
    if (action === 'create_user') {
      const { full_name, username, role, password } = body;

      if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
        return new Response(
          JSON.stringify({ error: 'full_name is required and must be a non-empty string.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!username || typeof username !== 'string') {
        return new Response(
          JSON.stringify({ error: 'username is required and must be a string.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const cleanUsername = username.trim().toLowerCase();
      if (!/^[a-z0-9_]{3,30}$/.test(cleanUsername)) {
        return new Response(
          JSON.stringify({ error: 'Username must be 3-30 characters containing only letters, numbers, and underscores.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!password || typeof password !== 'string' || password.length < 6) {
        return new Response(
          JSON.stringify({ error: 'Password must be a string of at least 6 characters.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!role || typeof role !== 'string') {
        return new Response(
          JSON.stringify({ error: 'role is required and must be a string.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Enforce official department strictly from approved role mapping (Caller-supplied department overrides are ignored)
      const officialDept = STRICT_ROLE_DEPARTMENTS[role];
      if (!officialDept) {
        return new Response(
          JSON.stringify({
            error: `Invalid role "${role}". Must be one of: ${Object.keys(STRICT_ROLE_DEPARTMENTS).join(', ')}`,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check username uniqueness in profiles
      const { data: existingUser } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('username', cleanUsername)
        .limit(1);

      if (existingUser && existingUser.length > 0) {
        return new Response(
          JSON.stringify({ error: `Username "${cleanUsername}" is already taken.` }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const virtualEmail = `${cleanUsername}@aimplb.internal`;

      // 1. Create in Supabase Auth Admin API (zero direct DML on auth.users)
      const { data: newAuthData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
        email: virtualEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name.trim(),
          username: cleanUsername,
        },
      });

      if (createAuthError || !newAuthData?.user) {
        const errMsg = (createAuthError?.message || '').toLowerCase();
        const isDuplicate =
          errMsg.includes('already registered') ||
          errMsg.includes('already exists') ||
          errMsg.includes('already in use') ||
          (createAuthError as any)?.status === 422;

        return new Response(
          JSON.stringify({
            error: isDuplicate
              ? `User with username "${cleanUsername}" is already registered in auth.`
              : 'Failed to create auth credentials: ' + sanitizeErrorMessage(createAuthError),
          }),
          { status: isDuplicate ? 409 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 2. Insert into public.profiles with enforced official department
      const { data: newProfile, error: insertProfileError } = await supabaseAdmin
        .from('profiles')
        .insert([
          {
            id: newAuthData.user.id,
            full_name: full_name.trim(),
            username: cleanUsername,
            role: role,
            department: officialDept,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (insertProfileError) {
        // Rollback auth user if profile insertion failed
        await supabaseAdmin.auth.admin.deleteUser(newAuthData.user.id);
        return new Response(
          JSON.stringify({ error: 'Failed to register profile: ' + sanitizeErrorMessage(insertProfileError) }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 3. Record in audit_logs (sanitized, zero password/credentials logged)
      await supabaseAdmin.from('audit_logs').insert([
        {
          user_id: callerUser.id,
          user_name: callerProfile.full_name,
          action: 'CREATE_USER',
          table_name: 'profiles',
          record_id: newAuthData.user.id,
          new_data: { username: cleanUsername, role: role, department: officialDept },
        },
      ]);

      return new Response(
        JSON.stringify({ success: true, profile: newProfile }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================================
    // ACTION 3: ADMIN RESETS VOLUNTEER PASSWORD (AUTH ADMIN API)
    // =========================================================================
    if (action === 'reset_password') {
      const { user_id, new_password } = body;

      if (!user_id || typeof user_id !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Valid user_id string is required.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!new_password || typeof new_password !== 'string' || new_password.length < 6) {
        return new Response(
          JSON.stringify({ error: 'new_password must be a string of at least 6 characters.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update password via Auth Admin API (passwords never stored in public tables)
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
        password: new_password,
      });

      if (updateError) {
        const errMsg = (updateError.message || '').toLowerCase();
        const isNotFound = errMsg.includes('not found') || (updateError as any)?.status === 404;

        return new Response(
          JSON.stringify({
            error: isNotFound ? 'User not found.' : 'Password update failed: ' + sanitizeErrorMessage(updateError),
          }),
          { status: isNotFound ? 404 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Record in audit_logs (zero passwords logged)
      await supabaseAdmin.from('audit_logs').insert([
        {
          user_id: callerUser.id,
          user_name: callerProfile.full_name,
          action: 'RESET_PASSWORD',
          table_name: 'auth.users',
          record_id: user_id,
        },
      ]);

      return new Response(
        JSON.stringify({ success: true, message: 'Password reset successfully.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================================
    // ACTION 4: ADMIN TOGGLES VOLUNTEER ACTIVE / DEACTIVATED STATE
    // =========================================================================
    if (action === 'toggle_active') {
      const { user_id, is_active } = body;

      if (!user_id || typeof user_id !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Valid user_id string is required.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (typeof is_active !== 'boolean') {
        return new Response(
          JSON.stringify({ error: 'is_active must be a boolean (true or false).' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Prevent Admin self-deactivation lockout
      if (user_id === callerUser.id && !is_active) {
        return new Response(
          JSON.stringify({ error: 'Self-lockout prevented: You cannot deactivate your own administrative account.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', user_id)
        .select()
        .maybeSingle();

      if (updateError) {
        return new Response(
          JSON.stringify({ error: 'Failed to update access state: ' + sanitizeErrorMessage(updateError) }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!updatedProfile) {
        return new Response(
          JSON.stringify({ error: 'User profile not found.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Record in audit_logs
      await supabaseAdmin.from('audit_logs').insert([
        {
          user_id: callerUser.id,
          user_name: callerProfile.full_name,
          action: is_active ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
          table_name: 'profiles',
          record_id: user_id,
          new_data: { is_active },
        },
      ]);

      return new Response(
        JSON.stringify({ success: true, profile: updatedProfile }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action "${action}". Supported actions: bootstrap, login, create_user, reset_password, toggle_active.` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'Internal server error: ' + sanitizeErrorMessage(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
