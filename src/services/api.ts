import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { safeStorage } from '@/lib/safeStorage';
import {
  Invitee,
  InviteeCategory,
  TransportationRecord,
  AccommodationRecord,
  FoodRecord,
  ReceptionRecord,
  MeetingHallRecord,
  UserProfile,
  AuditLog,
  SystemSettings,
  UserRole,
  EventAttendanceRecord,
  MeetingRoom,
  MeetingAttendanceRecord,
  UnifiedActivityEvent,
} from '@/types';

let dbUpdateTimeout: ReturnType<typeof setTimeout> | null = null;
export function notifyDbUpdate(): void {
  clearInviteeLookupCache();
  if (typeof window === 'undefined') return;
  if (dbUpdateTimeout) clearTimeout(dbUpdateTimeout);
  dbUpdateTimeout = setTimeout(() => {
    window.dispatchEvent(new Event('aimplb_db_update'));
  }, 25);
}

// -------------------------------------------------------------
// AUDIT LOG SERVICE
// -------------------------------------------------------------
export async function recordAuditLog(
  user: UserProfile | null | undefined,
  action: string,
  tableName: string,
  recordId: string,
  previousData?: any,
  newData?: any
): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from('audit_logs').insert([
      {
        user_id: user?.id || null,
        user_name: user?.full_name || null,
        action,
        table_name: tableName,
        record_id: String(recordId),
        previous_data: previousData ? JSON.parse(JSON.stringify(previousData)) : null,
        new_data: newData ? JSON.parse(JSON.stringify(newData)) : null,
      },
    ]);
  } catch (err) {
    console.warn('[AuditLog] Non-critical audit logging failed:', err);
  }
}

// -------------------------------------------------------------
// INVITEES SERVICE
// -------------------------------------------------------------
function getCurrentSessionUserRole(): string | null {
  try {
    const raw = safeStorage.getItem('aimplb_current_user_session');
    if (!raw) return null;
    const user = JSON.parse(raw);
    return user?.role || null;
  } catch {
    return null;
  }
}

function redactInviteeForNonAdmin(invitee: Invitee): Invitee {
  return {
    ...invitee,
    address: '[Restricted]',
  };
}

export function getCategoryPrefix(category: InviteeCategory): string {
  switch (category) {
    case 'Founder Members':
      return 'AIM-F-';
    case 'Special Invitees':
      return 'AIM-S-';
    case 'General Members':
    default:
      return 'AIM-G-';
  }
}

export function generateNextCategoryCode(category: InviteeCategory, existingInvitees: Invitee[]): string {
  const prefix = getCategoryPrefix(category);
  const matchingCodes = existingInvitees
    .filter((i) => i.category === category && i.invitee_code && i.invitee_code.startsWith(prefix))
    .map((i) => {
      const numPart = parseInt(i.invitee_code.replace(prefix, ''), 10);
      return isNaN(numPart) ? 0 : numPart;
    });
  const maxNum = matchingCodes.length > 0 ? Math.max(...matchingCodes) : 0;
  return `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
}

export function generateSecureQrToken(inviteeIdOrCode: string): string {
  const clean = inviteeIdOrCode.replace(/[^a-zA-Z0-9]/g, '');
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `AIM-SEC-${clean}-${rand}`;
}

export async function getRawInvitees(): Promise<Invitee[]> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Please check your environment variables.');
  }

  const { data, error } = await supabase
    .from('invitees')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[InviteeService] Supabase SELECT failed:', error);
    throw new Error(`Failed to load invitees from Supabase: ${error.message} (${error.code})`);
  }

  return (data || []) as Invitee[];
}

export async function getInvitees(): Promise<Invitee[]> {
  const rawList = await getRawInvitees();
  const role = getCurrentSessionUserRole();
  if (role === 'Admin') {
    return rawList;
  }
  return rawList.map(redactInviteeForNonAdmin);
}

export async function getInviteeById(id: string): Promise<Invitee | null> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('invitees')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error(`[InviteeService] Supabase SELECT by ID failed (${id}):`, error);
    throw new Error(`Failed to load invitee from Supabase: ${error.message}`);
  }

  if (!data) return null;
  const role = getCurrentSessionUserRole();
  return role === 'Admin' ? (data as Invitee) : redactInviteeForNonAdmin(data as Invitee);
}

// -------------------------------------------------------------
// CACHED INVITEES LOOKUP MAP (SWR + In-flight deduplication)
// Eliminates 7x redundant queries across concurrent dashboard modules
// -------------------------------------------------------------
let cachedInviteeMap: Map<string, Invitee> | null = null;
let cachedInviteeMapTime = 0;
let inflightInviteeMapPromise: Promise<Map<string, Invitee>> | null = null;
const INV_LOOKUP_CACHE_TTL_MS = 20_000; // 20 seconds TTL

export function clearInviteeLookupCache(): void {
  cachedInviteeMap = null;
  cachedInviteeMapTime = 0;
  inflightInviteeMapPromise = null;
}

/**
 * Lightweight invitee lookup map designed for sub-module relational joins (transport, food, gate, etc.).
 * Uses in-memory SWR caching (20s TTL) and deduplicates simultaneous requests in flight.
 */
export async function getInviteeLookupMap(): Promise<Map<string, Invitee>> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }

  const now = Date.now();
  if (cachedInviteeMap && now - cachedInviteeMapTime < INV_LOOKUP_CACHE_TTL_MS) {
    return cachedInviteeMap;
  }

  if (inflightInviteeMapPromise) {
    return inflightInviteeMapPromise;
  }

  inflightInviteeMapPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('invitees')
        .select('id, invitee_code, full_name, category, phone, alternate_phone, address, city, state, country, remarks, id_card_remarks, qr_token, created_by, created_at, updated_at');

      if (error) {
        console.warn('[InviteeService] Failed to load invitee lookup map, falling back to full list:', error);
        const full = await getInvitees();
        const map = new Map(full.map((i) => [i.id, i]));
        cachedInviteeMap = map;
        cachedInviteeMapTime = Date.now();
        return map;
      }

      const map = new Map(((data || []) as Invitee[]).map((i) => [i.id, i]));
      cachedInviteeMap = map;
      cachedInviteeMapTime = Date.now();
      return map;
    } finally {
      inflightInviteeMapPromise = null;
    }
  })();

  return inflightInviteeMapPromise;
}

export async function getInviteeByQrToken(token: string): Promise<Invitee | null> {
  const clean = token.trim();
  if (!clean) return null;
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');

  // Check matching by qr_token first
  const { data: byToken, error: tokenErr } = await supabase
    .from('invitees')
    .select('*')
    .eq('qr_token', clean)
    .maybeSingle();

  if (!tokenErr && byToken) {
    const role = getCurrentSessionUserRole();
    return role === 'Admin' ? (byToken as Invitee) : redactInviteeForNonAdmin(byToken as Invitee);
  }

  // Fallback to checking by invitee_code
  const { data: byCode } = await supabase
    .from('invitees')
    .select('*')
    .ilike('invitee_code', clean)
    .maybeSingle();

  if (byCode) {
    const role = getCurrentSessionUserRole();
    return role === 'Admin' ? (byCode as Invitee) : redactInviteeForNonAdmin(byCode as Invitee);
  }

  return null;
}

export async function getInviteeByCode(code: string): Promise<Invitee | null> {
  const clean = code.trim().toUpperCase();
  if (!clean) return null;
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase
    .from('invitees')
    .select('*')
    .ilike('invitee_code', clean)
    .maybeSingle();

  if (error || !data) return null;
  const role = getCurrentSessionUserRole();
  return role === 'Admin' ? (data as Invitee) : redactInviteeForNonAdmin(data as Invitee);
}

// -------------------------------------------------------------
// PHONE VALIDATION & DUPLICATE PREVENTION HELPERS
// -------------------------------------------------------------
export function extract10DigitPhone(phoneStr: string | null | undefined): string | null {
  if (!phoneStr) return null;
  const digits = phoneStr.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length > 10) return digits.slice(-10);
  return null;
}

export function isValid10DigitPhone(phoneStr: string | null | undefined): boolean {
  if (!phoneStr) return false;
  const digits = phoneStr.replace(/\D/g, '');
  return digits.length === 10 || (digits.length === 12 && digits.startsWith('91'));
}

export async function checkDuplicateInvitee(
  phone: string,
  fullName: string,
  excludeId?: string
): Promise<{ isDuplicate: boolean; matchedBy: 'phone' | 'name' | null; existing?: Invitee }> {
  if (!isSupabaseConfigured) return { isDuplicate: false, matchedBy: null };

  const cleanPhone = extract10DigitPhone(phone);
  const cleanName = fullName.trim().toLowerCase();

  let query = supabase.from('invitees').select('*');
  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;
  if (error || !data) return { isDuplicate: false, matchedBy: null };

  for (const inv of data as Invitee[]) {
    // 1. Strict duplicate phone check (matching 10 digits)
    const existingCleanPhone = extract10DigitPhone(inv.phone);
    if (cleanPhone && existingCleanPhone && cleanPhone === existingCleanPhone) {
      return { isDuplicate: true, matchedBy: 'phone', existing: inv };
    }

    // 2. Strict duplicate name check (case-insensitive & trimmed)
    if (cleanName && (inv.full_name || '').trim().toLowerCase() === cleanName) {
      return { isDuplicate: true, matchedBy: 'name', existing: inv };
    }
  }

  return { isDuplicate: false, matchedBy: null };
}

export async function createInvitee(
  data: Omit<Invitee, 'id' | 'invitee_code' | 'created_at' | 'updated_at'>,
  user: UserProfile
): Promise<Invitee> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot create invitee.');
  }

  // 1. Phone number must contain exactly 10 digits
  if (!isValid10DigitPhone(data.phone)) {
    throw new Error('Primary phone number must contain exactly 10 digits (e.g. 9840123456).');
  }
  if (data.alternate_phone && data.alternate_phone.trim() && !isValid10DigitPhone(data.alternate_phone)) {
    throw new Error('Alternate phone number must contain exactly 10 digits.');
  }

  // 2. Uniqueness verification: No two invitees can have the same phone number or same name
  const duplicateCheck = await checkDuplicateInvitee(data.phone, data.full_name);
  if (duplicateCheck.isDuplicate) {
    if (duplicateCheck.matchedBy === 'phone') {
      throw new Error(
        `Duplicate Phone Blocked: An invitee with phone number "${data.phone}" already exists (${duplicateCheck.existing?.full_name} - ${duplicateCheck.existing?.invitee_code}).`
      );
    }
    if (duplicateCheck.matchedBy === 'name') {
      throw new Error(
        `Duplicate Name Blocked: An invitee with the name "${data.full_name.trim()}" already exists (${duplicateCheck.existing?.invitee_code}). Duplicate names are not permitted.`
      );
    }
  }

  const prefix = getCategoryPrefix(data.category);
  const { data: latestCategoryInvitees } = await supabase
    .from('invitees')
    .select('invitee_code')
    .ilike('invitee_code', `${prefix}%`)
    .order('invitee_code', { ascending: false })
    .limit(100);

  let maxNum = 0;
  if (latestCategoryInvitees && latestCategoryInvitees.length > 0) {
    for (const item of latestCategoryInvitees) {
      const num = parseInt(item.invitee_code.replace(prefix, ''), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  }
  const nextCode = `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
  const qrToken = generateSecureQrToken(nextCode);

  const payload = {
    full_name: data.full_name.trim(),
    category: data.category,
    phone: data.phone.trim(),
    alternate_phone: data.alternate_phone?.trim() || null,
    address: data.address?.trim() || null,
    city: data.city.trim(),
    state: data.state.trim(),
    country: data.country?.trim() || 'India',
    remarks: data.remarks?.trim() || null,
    id_card_remarks: data.id_card_remarks?.trim() || null,
    invitee_code: nextCode,
    qr_token: qrToken,
    created_by: user.id,
  };

  const { data: inserted, error } = await supabase
    .from('invitees')
    .insert([payload])
    .select()
    .single();

  if (error || !inserted) {
    console.error('[InviteeService] Supabase INSERT failed:', error);
    if (error?.code === '23505') {
      throw new Error('Duplicate Entry Blocked: An invitee with this phone number or name already exists in the database.');
    }
    throw new Error(`Failed to create invitee in Supabase: ${error?.message || 'Database error'} (${error?.code || 'ERR'})`);
  }

  await recordAuditLog(user, 'INSERT', 'invitees', inserted.id, null, inserted);
  notifyDbUpdate();
  return inserted as Invitee;
}

export async function updateInvitee(
  id: string,
  data: Partial<Invitee>,
  user: UserProfile
): Promise<Invitee> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot update invitee.');
  }

  // 1. Phone number validation if updating phone
  if (data.phone && !isValid10DigitPhone(data.phone)) {
    throw new Error('Primary phone number must contain exactly 10 digits (e.g. 9840123456).');
  }
  if (data.alternate_phone && data.alternate_phone.trim() && !isValid10DigitPhone(data.alternate_phone)) {
    throw new Error('Alternate phone number must contain exactly 10 digits.');
  }

  // 2. Uniqueness verification if updating phone or name
  if (data.phone || data.full_name) {
    const existingInvitee = await getInviteeById(id);
    const phoneToCheck = data.phone || existingInvitee?.phone || '';
    const nameToCheck = data.full_name || existingInvitee?.full_name || '';

    const duplicateCheck = await checkDuplicateInvitee(phoneToCheck, nameToCheck, id);
    if (duplicateCheck.isDuplicate) {
      if (duplicateCheck.matchedBy === 'phone') {
        throw new Error(
          `Duplicate Phone Blocked: Another invitee with phone number "${phoneToCheck}" already exists (${duplicateCheck.existing?.full_name} - ${duplicateCheck.existing?.invitee_code}).`
        );
      }
      if (duplicateCheck.matchedBy === 'name') {
        throw new Error(
          `Duplicate Name Blocked: Another invitee with the name "${nameToCheck.trim()}" already exists (${duplicateCheck.existing?.invitee_code}). Duplicate names are not permitted.`
        );
      }
    }
  }

  const {
    id: _id,
    created_at: _ca,
    ...updatePayload
  } = data as any;

  const { data: updated, error } = await supabase
    .from('invitees')
    .update({
      ...updatePayload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error || !updated) {
    console.error(`[InviteeService] Supabase UPDATE failed (${id}):`, error);
    throw new Error(`Failed to update invitee in Supabase: ${error?.message || 'Record not found'} (${error?.code || 'ERR'})`);
  }

  await recordAuditLog(user, 'UPDATE', 'invitees', id, null, updated);
  notifyDbUpdate();
  return updated as Invitee;
}

export async function deleteInvitee(id: string, user: UserProfile): Promise<boolean> {
  if (user.role !== 'Admin') {
    throw new Error('Unauthorized: Only Admin can delete invitees');
  }

  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot delete invitee.');
  }

  const { error } = await supabase
    .from('invitees')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`[InviteeService] Supabase DELETE failed (${id}):`, error);
    throw new Error(`Failed to delete invitee in Supabase: ${error.message} (${error.code})`);
  }

  await recordAuditLog(user, 'DELETE', 'invitees', id, null, null);
  notifyDbUpdate();
  return true;
}

// -------------------------------------------------------------
// TRANSPORTATION SERVICE
// -------------------------------------------------------------
export async function getTransportationRecords(): Promise<TransportationRecord[]> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot load transportation records.');
  }

  const inviteeMap = await getInviteeLookupMap();

  const { data, error } = await supabase
    .from('transportation')
    .select('*')
    .order('journey_date', { ascending: true });

  if (error) {
    console.error('[TransportationService] Supabase SELECT failed:', error);
    throw new Error(`Failed to load transportation records: ${error.message} (${error.code})`);
  }

  return ((data || []) as TransportationRecord[]).map((t) => ({
    ...t,
    invitee: inviteeMap.get(t.invitee_id),
  }));
}

export async function createTransportation(
  data: Omit<TransportationRecord, 'id' | 'created_at' | 'updated_at'>,
  user: UserProfile
): Promise<TransportationRecord> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot create transportation record.');
  }

  const { invitee: _inv, id: _id, created_at: _ca, updated_at: _ua, ...cleanData } = data as any;
  const payload = {
    ...cleanData,
    created_by: user.id,
    updated_by: user.id,
  };

  const { data: inserted, error } = await supabase
    .from('transportation')
    .insert([payload])
    .select()
    .single();

  if (error || !inserted) {
    console.error('[TransportationService] Supabase INSERT failed:', error);
    throw new Error(`Failed to create transportation record: ${error?.message || 'Database error'} (${error?.code || 'ERR'})`);
  }

  await recordAuditLog(user, 'INSERT', 'transportation', inserted.id, null, inserted);
  notifyDbUpdate();
  return inserted as TransportationRecord;
}

export async function updateTransportation(
  id: string,
  data: Partial<TransportationRecord>,
  user: UserProfile
): Promise<TransportationRecord> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot update transportation record.');
  }

  const { id: _id, invitee: _inv, created_at: _ca, ...cleanData } = data as any;
  const payload = {
    ...cleanData,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  const { data: updated, error } = await supabase
    .from('transportation')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error || !updated) {
    console.error(`[TransportationService] Supabase UPDATE failed (${id}):`, error);
    throw new Error(`Failed to update transportation record: ${error?.message || 'Record not found'} (${error?.code || 'ERR'})`);
  }

  await recordAuditLog(user, 'UPDATE', 'transportation', id, null, updated);
  notifyDbUpdate();
  return updated as TransportationRecord;
}

export async function deleteTransportation(id: string, user: UserProfile): Promise<boolean> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot delete transportation record.');
  }

  const { error } = await supabase.from('transportation').delete().eq('id', id);
  if (error) {
    console.error(`[TransportationService] Supabase DELETE failed (${id}):`, error);
    throw new Error(`Failed to delete transportation record: ${error.message} (${error.code})`);
  }

  await recordAuditLog(user, 'DELETE', 'transportation', id, null, null);
  notifyDbUpdate();
  return true;
}

// -------------------------------------------------------------
// ACCOMMODATION SERVICE & ROOM CONFLICT CHECK
// -------------------------------------------------------------
export async function getAccommodations(): Promise<AccommodationRecord[]> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot load accommodations.');
  }

  const inviteeMap = await getInviteeLookupMap();

  const { data, error } = await supabase
    .from('accommodations')
    .select('*')
    .order('check_in_date', { ascending: true });

  if (error) {
    console.error('[AccommodationService] Supabase SELECT failed:', error);
    throw new Error(`Failed to load accommodations: ${error.message} (${error.code})`);
  }

  return ((data || []) as AccommodationRecord[]).map((a) => ({
    ...a,
    invitee: inviteeMap.get(a.invitee_id),
  }));
}

export async function checkRoomConflict(
  hotelName: string,
  roomNumber: string,
  checkInDate: string,
  checkOutDate: string,
  excludeRecordId?: string
): Promise<{ hasConflict: boolean; conflictingWith?: AccommodationRecord }> {
  if (!roomNumber || !checkInDate || !checkOutDate) {
    return { hasConflict: false };
  }

  if (!isSupabaseConfigured) {
    return { hasConflict: false };
  }

  // Optimized targeted query: only inspect records for the exact hotel and room
  const { data, error } = await supabase
    .from('accommodations')
    .select('*')
    .ilike('hotel_name', hotelName.trim())
    .ilike('room_number', roomNumber.trim());

  if (error || !data) {
    console.warn('[AccommodationService] Direct room conflict lookup error:', error);
    return { hasConflict: false };
  }

  const inDate = new Date(checkInDate).getTime();
  const outDate = new Date(checkOutDate).getTime();

  for (const acc of (data as AccommodationRecord[])) {
    if (excludeRecordId && acc.id === excludeRecordId) continue;
    if (acc.check_in_date && acc.check_out_date) {
      const existingIn = new Date(acc.check_in_date).getTime();
      const existingOut = new Date(acc.check_out_date).getTime();

      // Check date interval overlap: (StartA < EndB) and (EndA > StartB)
      if (inDate < existingOut && outDate > existingIn) {
        return { hasConflict: true, conflictingWith: acc };
      }
    }
  }

  return { hasConflict: false };
}

export async function createAccommodation(
  data: Omit<AccommodationRecord, 'id' | 'created_at' | 'updated_at'>,
  user: UserProfile,
  allowShared = false
): Promise<AccommodationRecord> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot create accommodation.');
  }

  if (!allowShared && data.hotel_name && data.room_number && data.check_in_date && data.check_out_date) {
    const conflict = await checkRoomConflict(
      data.hotel_name,
      data.room_number,
      data.check_in_date,
      data.check_out_date
    );
    if (conflict.hasConflict) {
      throw new Error(
        `Room conflict: ${data.room_number} in ${data.hotel_name} is already assigned to ${conflict.conflictingWith?.invitee?.full_name || 'another invitee'} during this time.`
      );
    }
  }

  const { invitee: _inv, id: _id, created_at: _ca, updated_at: _ua, ...cleanData } = data as any;
  const payload = {
    ...cleanData,
    created_by: user.id,
    updated_by: user.id,
  };

  const { data: inserted, error } = await supabase
    .from('accommodations')
    .insert([payload])
    .select()
    .single();

  if (error || !inserted) {
    console.error('[AccommodationService] Supabase INSERT failed:', error);
    throw new Error(`Failed to create accommodation record: ${error?.message || 'Database error'} (${error?.code || 'ERR'})`);
  }

  await recordAuditLog(user, 'INSERT', 'accommodations', inserted.id, null, inserted);
  notifyDbUpdate();
  return inserted as AccommodationRecord;
}

export async function updateAccommodation(
  id: string,
  data: Partial<AccommodationRecord>,
  user: UserProfile,
  allowShared = false
): Promise<AccommodationRecord> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot update accommodation.');
  }

  const hotel = data.hotel_name;
  const room = data.room_number;
  const checkIn = data.check_in_date;
  const checkOut = data.check_out_date;

  if (!allowShared && hotel && room && checkIn && checkOut) {
    const conflict = await checkRoomConflict(hotel, room, checkIn, checkOut, id);
    if (conflict.hasConflict) {
      throw new Error(
        `Room conflict: ${room} in ${hotel} is already assigned to ${conflict.conflictingWith?.invitee?.full_name || 'another invitee'} during this time.`
      );
    }
  }

  const { id: _id, invitee: _inv, created_at: _ca, ...cleanData } = data as any;
  const payload = {
    ...cleanData,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  const { data: updated, error } = await supabase
    .from('accommodations')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error || !updated) {
    console.error(`[AccommodationService] Supabase UPDATE failed (${id}):`, error);
    throw new Error(`Failed to update accommodation record: ${error?.message || 'Record not found'} (${error?.code || 'ERR'})`);
  }

  await recordAuditLog(user, 'UPDATE', 'accommodations', id, null, updated);
  notifyDbUpdate();
  return updated as AccommodationRecord;
}

export async function deleteAccommodation(id: string, user: UserProfile): Promise<boolean> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot delete accommodation.');
  }

  const { error } = await supabase.from('accommodations').delete().eq('id', id);
  if (error) {
    console.error(`[AccommodationService] Supabase DELETE failed (${id}):`, error);
    throw new Error(`Failed to delete accommodation record: ${error.message} (${error.code})`);
  }

  await recordAuditLog(user, 'DELETE', 'accommodations', id, null, null);
  notifyDbUpdate();
  return true;
}

export async function registerAccommodation(
  accommodationId: string,
  user: UserProfile
): Promise<AccommodationRecord> {
  const now = new Date().toISOString();
  return updateAccommodation(
    accommodationId,
    {
      hotel_registered: true,
      registration_status: 'Registered',
      registered_at: now,
      registered_by: user.id,
    },
    user,
    true
  );
}

export async function undoAccommodationRegistration(
  accommodationId: string,
  user: UserProfile,
  reason?: string
): Promise<AccommodationRecord> {
  const updated = await updateAccommodation(
    accommodationId,
    {
      hotel_registered: false,
      registration_status: 'Pending',
      registered_at: null,
      registered_by: null,
      special_requirements: reason
        ? `Registration undone by ${user.full_name}: ${reason}`
        : null,
    },
    user,
    true
  );
  await recordAuditLog(user, 'UNDO_REGISTRATION', 'accommodations', accommodationId, null, { reason });
  return updated;
}

// -------------------------------------------------------------
// FOOD SERVICE
// -------------------------------------------------------------
export async function getFoodRecords(): Promise<FoodRecord[]> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot load food arrangements.');
  }

  const inviteeMap = await getInviteeLookupMap();

  const { data, error } = await supabase
    .from('food_arrangements')
    .select('*')
    .order('meal_date', { ascending: true });

  if (error) {
    console.error('[FoodService] Supabase SELECT failed:', error);
    throw new Error(`Failed to load food arrangements: ${error.message} (${error.code})`);
  }

  return ((data || []) as FoodRecord[]).map((f) => ({
    ...f,
    invitee: inviteeMap.get(f.invitee_id),
  }));
}

export async function createFoodRecord(
  data: Omit<FoodRecord, 'id' | 'created_at' | 'updated_at'>,
  user: UserProfile
): Promise<FoodRecord> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot create food record.');
  }

  const { invitee: _inv, id: _id, created_at: _ca, updated_at: _ua, ...cleanData } = data as any;
  const payload = {
    ...cleanData,
    created_by: user.id,
    updated_by: user.id,
  };

  const { data: inserted, error } = await supabase
    .from('food_arrangements')
    .insert([payload])
    .select()
    .single();

  if (error || !inserted) {
    console.error('[FoodService] Supabase INSERT failed:', error);
    throw new Error(`Failed to create food arrangement: ${error?.message || 'Database error'} (${error?.code || 'ERR'})`);
  }

  await recordAuditLog(user, 'INSERT', 'food_arrangements', inserted.id, null, inserted);
  notifyDbUpdate();
  return inserted as FoodRecord;
}

export async function updateFoodRecord(
  id: string,
  data: Partial<FoodRecord>,
  user: UserProfile
): Promise<FoodRecord> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot update food record.');
  }

  const { id: _id, invitee: _inv, created_at: _ca, ...cleanData } = data as any;
  const payload = {
    ...cleanData,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  const { data: updated, error } = await supabase
    .from('food_arrangements')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error || !updated) {
    console.error(`[FoodService] Supabase UPDATE failed (${id}):`, error);
    throw new Error(`Failed to update food arrangement: ${error?.message || 'Record not found'} (${error?.code || 'ERR'})`);
  }

  await recordAuditLog(user, 'UPDATE', 'food_arrangements', id, null, updated);
  notifyDbUpdate();
  return updated as FoodRecord;
}

export async function deleteFoodRecord(id: string, user: UserProfile): Promise<boolean> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot delete food record.');
  }

  const { error } = await supabase.from('food_arrangements').delete().eq('id', id);
  if (error) {
    console.error(`[FoodService] Supabase DELETE failed (${id}):`, error);
    throw new Error(`Failed to delete food record: ${error.message} (${error.code})`);
  }

  await recordAuditLog(user, 'DELETE', 'food_arrangements', id, null, null);
  notifyDbUpdate();
  return true;
}

// -------------------------------------------------------------
// RECEPTION SERVICE
// -------------------------------------------------------------
export async function getReceptionRecords(): Promise<ReceptionRecord[]> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot load reception records.');
  }

  const inviteeMap = await getInviteeLookupMap();

  const { data, error } = await supabase
    .from('reception')
    .select('*')
    .order('expected_arrival', { ascending: true });

  if (error) {
    console.error('[ReceptionService] Supabase SELECT failed:', error);
    throw new Error(`Failed to load reception records: ${error.message} (${error.code})`);
  }

  return ((data || []) as ReceptionRecord[]).map((r) => ({
    ...r,
    invitee: inviteeMap.get(r.invitee_id),
  }));
}

export async function createReceptionRecord(
  data: Omit<ReceptionRecord, 'id' | 'created_at' | 'updated_at'>,
  user: UserProfile
): Promise<ReceptionRecord> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot create reception record.');
  }

  const { invitee: _inv, id: _id, created_at: _ca, updated_at: _ua, ...cleanData } = data as any;
  const payload = {
    ...cleanData,
    created_by: user.id,
    updated_by: user.id,
  };

  const { data: inserted, error } = await supabase
    .from('reception')
    .insert([payload])
    .select()
    .single();

  if (error || !inserted) {
    console.error('[ReceptionService] Supabase INSERT failed:', error);
    throw new Error(`Failed to create reception record: ${error?.message || 'Database error'} (${error?.code || 'ERR'})`);
  }

  await recordAuditLog(user, 'INSERT', 'reception', inserted.id, null, inserted);
  notifyDbUpdate();
  return inserted as ReceptionRecord;
}

export async function updateReceptionRecord(
  id: string,
  data: Partial<ReceptionRecord>,
  user: UserProfile
): Promise<ReceptionRecord> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot update reception record.');
  }

  const { id: _id, invitee: _inv, created_at: _ca, ...cleanData } = data as any;
  const payload = {
    ...cleanData,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  const { data: updated, error } = await supabase
    .from('reception')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error || !updated) {
    console.error(`[ReceptionService] Supabase UPDATE failed (${id}):`, error);
    throw new Error(`Failed to update reception record: ${error?.message || 'Record not found'} (${error?.code || 'ERR'})`);
  }

  await recordAuditLog(user, 'UPDATE', 'reception', id, null, updated);
  notifyDbUpdate();
  return updated as ReceptionRecord;
}

// -------------------------------------------------------------
// MEETING HALL SERVICE & SEAT CONFLICT CHECK
// -------------------------------------------------------------
export async function getMeetingHallRecords(): Promise<MeetingHallRecord[]> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot load meeting hall assignments.');
  }

  const inviteeMap = await getInviteeLookupMap();

  const { data, error } = await supabase
    .from('meeting_hall_assignments')
    .select('*')
    .order('meeting_hall', { ascending: true });

  if (error) {
    console.error('[MeetingHallService] Supabase SELECT failed:', error);
    throw new Error(`Failed to load meeting hall records: ${error.message} (${error.code})`);
  }

  return ((data || []) as MeetingHallRecord[]).map((m) => ({
    ...m,
    invitee: inviteeMap.get(m.invitee_id),
  }));
}

export async function checkSeatConflict(
  hall: string,
  section: string,
  seat: string,
  excludeRecordId?: string
): Promise<{ hasConflict: boolean; conflictingWith?: MeetingHallRecord }> {
  if (!hall || !section || !seat) return { hasConflict: false };

  const list = await getMeetingHallRecords();
  for (const m of list) {
    if (excludeRecordId && m.id === excludeRecordId) continue;
    if (
      m.meeting_hall.toLowerCase().trim() === hall.toLowerCase().trim() &&
      m.seating_section.toLowerCase().trim() === section.toLowerCase().trim() &&
      m.seat_number.toLowerCase().trim() === seat.toLowerCase().trim()
    ) {
      return { hasConflict: true, conflictingWith: m };
    }
  }

  return { hasConflict: false };
}

export async function createMeetingHallRecord(
  data: Omit<MeetingHallRecord, 'id' | 'created_at' | 'updated_at'>,
  user: UserProfile
): Promise<MeetingHallRecord> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot create meeting hall record.');
  }

  const conflict = await checkSeatConflict(data.meeting_hall, data.seating_section, data.seat_number);
  if (conflict.hasConflict) {
    throw new Error(
      `Seat duplicate: Seat ${data.seat_number} in ${data.seating_section} (${data.meeting_hall}) is already assigned to ${conflict.conflictingWith?.invitee?.full_name || 'another invitee'}.`
    );
  }

  const { invitee: _inv, id: _id, created_at: _ca, updated_at: _ua, ...cleanData } = data as any;
  const payload = {
    ...cleanData,
    created_by: user.id,
    updated_by: user.id,
  };

  const { data: inserted, error } = await supabase
    .from('meeting_hall_assignments')
    .insert([payload])
    .select()
    .single();

  if (error || !inserted) {
    console.error('[MeetingHallService] Supabase INSERT failed:', error);
    throw new Error(`Failed to create meeting hall assignment: ${error?.message || 'Database error'} (${error?.code || 'ERR'})`);
  }

  await recordAuditLog(user, 'INSERT', 'meeting_hall_assignments', inserted.id, null, inserted);
  notifyDbUpdate();
  return inserted as MeetingHallRecord;
}

export async function updateMeetingHallRecord(
  id: string,
  data: Partial<MeetingHallRecord>,
  user: UserProfile
): Promise<MeetingHallRecord> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot update meeting hall record.');
  }

  const { id: _id, invitee: _inv, created_at: _ca, ...cleanData } = data as any;
  const hall = data.meeting_hall;
  const section = data.seating_section;
  const seat = data.seat_number;

  if (hall && section && seat) {
    const conflict = await checkSeatConflict(hall, section, seat, id);
    if (conflict.hasConflict) {
      throw new Error(
        `Seat duplicate: Seat ${seat} in ${section} (${hall}) is already assigned to ${conflict.conflictingWith?.invitee?.full_name || 'another invitee'}.`
      );
    }
  }

  const payload = {
    ...cleanData,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  const { data: updated, error } = await supabase
    .from('meeting_hall_assignments')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error || !updated) {
    console.error(`[MeetingHallService] Supabase UPDATE failed (${id}):`, error);
    throw new Error(`Failed to update meeting hall assignment: ${error?.message || 'Record not found'} (${error?.code || 'ERR'})`);
  }

  await recordAuditLog(user, 'UPDATE', 'meeting_hall_assignments', id, null, updated);
  notifyDbUpdate();
  return updated as MeetingHallRecord;
}

export async function deleteMeetingHallRecord(id: string, user: UserProfile): Promise<boolean> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot delete meeting hall record.');
  }

  const { error } = await supabase.from('meeting_hall_assignments').delete().eq('id', id);
  if (error) {
    console.error(`[MeetingHallService] Supabase DELETE failed (${id}):`, error);
    throw new Error(`Failed to delete meeting hall assignment: ${error.message} (${error.code})`);
  }

  await recordAuditLog(user, 'DELETE', 'meeting_hall_assignments', id, null, null);
  notifyDbUpdate();
  return true;
}

// -------------------------------------------------------------
// VOLUNTEER & PROFILE MANAGEMENT (Admin)
// -------------------------------------------------------------
export async function getProfiles(): Promise<UserProfile[]> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot load profiles.');
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[VolunteerService] Supabase SELECT failed:', error);
    throw new Error(`Failed to load user profiles: ${error.message} (${error.code})`);
  }

  return (data || []) as UserProfile[];
}

/**
 * Ensures an active, verified, unexpired session token is available for privileged Edge Function calls.
 * Gracefully uses existing valid session access token without premature rejection.
 */
export async function getFreshAdminAccessToken(): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  const nowSeconds = Math.floor(Date.now() / 1000);

  // If session is present and valid for more than 15 seconds, return immediately
  if (!sessionError && session?.access_token) {
    if (!session.expires_at || session.expires_at - nowSeconds > 15) {
      return session.access_token;
    }
  }

  // Attempt refresh if missing, expired, or expiring within 15 seconds
  try {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError && refreshData?.session?.access_token) {
      return refreshData.session.access_token;
    }
  } catch (refreshErr) {
    console.warn('[VolunteerService] Session refresh attempt error:', refreshErr);
  }

  // Resilient fallback: If refresh failed but session access token still has validity
  if (session?.access_token && (!session.expires_at || session.expires_at > nowSeconds)) {
    return session.access_token;
  }

  throw new Error('Invalid or expired authentication session. Please sign in again.');
}

export async function createVolunteer(
  data: {
    full_name: string;
    username: string;
    role: UserRole;
    department: string;
    password?: string;
  },
  adminUser: UserProfile
): Promise<UserProfile> {
  if (adminUser.role !== 'Admin') {
    throw new Error('Unauthorized: Only Admin can create volunteers');
  }

  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot create volunteer.');
  }

  const token = await getFreshAdminAccessToken();

  const { data: edgeData, error: edgeError } = await supabase.functions.invoke('admin-users', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: {
      action: 'create_user',
      full_name: data.full_name,
      username: data.username,
      role: data.role,
      password: data.password || 'AIMPLB@2026',
    },
  });

  if (edgeError || !edgeData?.profile) {
    let errorMsg = edgeData?.error || edgeData?.message || edgeError?.message || 'Failed to create volunteer through Supabase Admin';
    if (edgeError && (edgeError as any).context) {
      try {
        const errJson = await (edgeError as any).context.json();
        if (errJson?.error || errJson?.message) {
          errorMsg = errJson.error || errJson.message;
        }
        if (errJson?.details) {
          errorMsg = `${errorMsg} (${errJson.details})`;
        }
      } catch (_) {}
    }
    console.error('[VolunteerService] Edge Function create_user failed:', errorMsg, edgeError || edgeData);
    throw new Error(errorMsg);
  }

  await recordAuditLog(adminUser, 'INSERT', 'profiles', edgeData.profile.id, null, edgeData.profile);
  notifyDbUpdate();
  return edgeData.profile as UserProfile;
}

export async function updateVolunteer(
  id: string,
  data: Partial<UserProfile>,
  adminUser: UserProfile
): Promise<UserProfile> {
  if (adminUser.role !== 'Admin') {
    throw new Error('Unauthorized: Only Admin can update volunteers');
  }

  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot update volunteer.');
  }

  if (typeof data.is_active === 'boolean') {
    try {
      const token = await getFreshAdminAccessToken();
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('admin-users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: {
          action: 'toggle_active',
          user_id: id,
          is_active: data.is_active,
        },
      });
      if (!edgeError && edgeData?.profile) {
        await recordAuditLog(adminUser, 'TOGGLE_ACTIVE', 'profiles', id, null, edgeData.profile);
        notifyDbUpdate();
        return edgeData.profile as UserProfile;
      }
    } catch (e) {
      console.warn('Edge function toggle_active failed, falling back to direct profile update:', e);
    }
  }

  const { id: _id, created_at: _ca, ...cleanData } = data as any;
  const { data: updated, error } = await supabase
    .from('profiles')
    .update({ ...cleanData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error || !updated) {
    console.error(`[VolunteerService] Supabase UPDATE failed (${id}):`, error);
    throw new Error(`Failed to update profile: ${error?.message || 'Database error'} (${error?.code || 'ERR'})`);
  }

  await recordAuditLog(adminUser, 'UPDATE', 'profiles', id, null, updated);
  notifyDbUpdate();
  return updated as UserProfile;
}

export async function resetVolunteerPassword(
  userId: string,
  newPassword: string,
  adminUser: UserProfile
): Promise<{ success: boolean; message?: string }> {
  if (adminUser.role !== 'Admin') {
    throw new Error('Unauthorized: Only Admin can reset passwords');
  }

  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot reset password.');
  }

  const token = await getFreshAdminAccessToken();

  const { data, error } = await supabase.functions.invoke('admin-users', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: {
      action: 'reset_password',
      user_id: userId,
      new_password: newPassword,
    },
  });

  if (error || !data?.success) {
    let msg = data?.error || data?.message || error?.message || 'Password reset failed via server.';
    if (error && (error as any).context) {
      try {
        const errJson = await (error as any).context.json();
        if (errJson?.error || errJson?.message) {
          msg = errJson.error || errJson.message;
        }
      } catch (_) {}
    }
    throw new Error(msg);
  }

  await recordAuditLog(adminUser, 'RESET_PASSWORD', 'profiles', userId, null, { success: true });
  return { success: true, message: data?.message || 'Password reset successfully.' };
}

// -------------------------------------------------------------
// AUDIT LOGS & SETTINGS
// -------------------------------------------------------------
export async function getAuditLogs(): Promise<AuditLog[]> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot load audit logs.');
  }

  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[AuditLogsService] Supabase SELECT failed:', error);
    throw new Error(`Failed to load audit logs: ${error.message} (${error.code})`);
  }

  return (data || []) as AuditLog[];
}

export async function getSystemSettings(): Promise<SystemSettings[]> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot load system settings.');
  }

  const { data, error } = await supabase.from('system_settings').select('*');
  if (error) {
    console.error('[SystemSettingsService] Supabase SELECT failed:', error);
    throw new Error(`Failed to load system settings: ${error.message} (${error.code})`);
  }

  return (data || []) as SystemSettings[];
}

export async function updateSystemSetting(
  key: string,
  value: any,
  adminUser: UserProfile
): Promise<void> {
  if (adminUser.role !== 'Admin') {
    throw new Error('Unauthorized: Only Admin can modify system settings');
  }

  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot update system settings.');
  }

  const { error } = await supabase
    .from('system_settings')
    .upsert({
      setting_key: key,
      setting_value: value,
      updated_by: adminUser.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'setting_key' });

  if (error) {
    console.error(`[SystemSettingsService] Supabase UPSERT failed (${key}):`, error);
    throw new Error(`Failed to update system setting: ${error.message} (${error.code})`);
  }

  await recordAuditLog(adminUser, 'UPDATE', 'system_settings', key, null, { setting_key: key, setting_value: value });
  notifyDbUpdate();
}

// -------------------------------------------------------------
// EVENT ATTENDANCE (GATE IN/OUT) SERVICE
// -------------------------------------------------------------
export async function getEventAttendanceRecords(
  inviteeId?: string,
  eventDate?: string
): Promise<EventAttendanceRecord[]> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot load event attendance.');
  }

  const inviteeMap = await getInviteeLookupMap();

  let query = supabase.from('event_attendance').select('*').order('entry_time', { ascending: false });
  if (inviteeId) query = query.eq('invitee_id', inviteeId);
  if (eventDate) query = query.eq('event_date', eventDate);

  const { data, error } = await query;
  if (error) {
    console.error('[EventAttendanceService] Supabase SELECT failed:', error);
    throw new Error(`Failed to load event attendance: ${error.message} (${error.code})`);
  }

  return ((data || []) as EventAttendanceRecord[]).map((r) => ({
    ...r,
    invitee: inviteeMap.get(r.invitee_id),
  }));
}

export async function recordEventEntry(
  inviteeId: string,
  user: UserProfile,
  eventDate?: string,
  notes?: string,
  scanMode: 'QR_CAMERA' | 'MANUAL_SEARCH' | 'MANUAL_OVERRIDE' = 'QR_CAMERA'
): Promise<EventAttendanceRecord> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot record event entry.');
  }

  const now = new Date().toISOString();
  const date = eventDate || now.slice(0, 10);

  // 1. Try atomic PostgreSQL RPC for high-concurrency protection
  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('record_gate_entry', {
      p_invitee_id: inviteeId,
      p_recorded_by: user.id,
      p_recorded_by_name: user.full_name,
      p_event_date: date,
      p_notes: notes || null,
      p_scan_mode: scanMode,
    });

    if (!rpcErr && rpcRes) {
      if (rpcRes.success === false) {
        throw new Error(rpcRes.message || 'Gate entry rejected.');
      }
      notifyDbUpdate();
      return rpcRes.record as EventAttendanceRecord;
    }
    if (rpcErr && rpcErr.code !== '42883') {
      console.warn('[EventAttendanceService] RPC record_gate_entry error:', rpcErr);
      if (rpcErr.message && !rpcErr.message.includes('function public.record_gate_entry')) {
        throw new Error(rpcErr.message);
      }
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('42883') && !err.message.includes('function public.record_gate_entry') && !err.code) {
      throw err;
    }
  }

  // 2. Direct database fallback with unique constraint protection
  const { data: activeSessions, error: activeErr } = await supabase
    .from('event_attendance')
    .select('*')
    .eq('invitee_id', inviteeId)
    .eq('status', 'IN')
    .is('exit_time', null);

  if (activeErr) {
    console.error('[EventAttendanceService] Active session check failed:', activeErr);
  }

  if (activeSessions && activeSessions.length > 0) {
    const entryFormatted = new Date(activeSessions[0].entry_time).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    throw new Error(
      `Duplicate Scan Blocked: Delegate is already checked IN (inside venue since ${entryFormatted}). Record gate exit (OUT) before re-entering.`
    );
  }

  const newRec = {
    invitee_id: inviteeId,
    event_date: date,
    entry_time: now,
    status: 'IN',
    entry_recorded_by: user.id,
    entry_recorded_by_name: user.full_name,
    entry_notes: notes || null,
    scan_mode: scanMode,
    is_corrected: false,
    duration_minutes: null,
  };

  const { data: inserted, error: insertErr } = await supabase
    .from('event_attendance')
    .insert([newRec])
    .select()
    .single();

  if (insertErr || !inserted) {
    console.error('[EventAttendanceService] Supabase INSERT failed:', insertErr);
    if (insertErr?.code === '23505') {
      throw new Error('Duplicate Scan Blocked: Delegate is already checked IN. Record gate exit (OUT) before re-entering.');
    }
    throw new Error(`Failed to record event entry: ${insertErr?.message || 'Database error'} (${insertErr?.code || 'ERR'})`);
  }

  await recordAuditLog(user, 'EVENT_ENTRY', 'event_attendance', inserted.id, null, inserted);
  notifyDbUpdate();
  return inserted as EventAttendanceRecord;
}

export async function recordEventExit(
  recordIdOrInviteeId: string,
  user: UserProfile,
  notes?: string,
  scanMode: 'QR_CAMERA' | 'MANUAL_SEARCH' | 'MANUAL_OVERRIDE' = 'QR_CAMERA'
): Promise<EventAttendanceRecord> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot record event exit.');
  }

  // 1. Try atomic PostgreSQL RPC for high-concurrency protection
  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('record_gate_exit', {
      p_identifier: recordIdOrInviteeId,
      p_recorded_by: user.id,
      p_recorded_by_name: user.full_name,
      p_notes: notes || null,
      p_scan_mode: scanMode,
    });

    if (!rpcErr && rpcRes) {
      if (rpcRes.success === false) {
        throw new Error(rpcRes.message || 'Gate exit rejected.');
      }
      notifyDbUpdate();
      return rpcRes.record as EventAttendanceRecord;
    }
    if (rpcErr && rpcErr.code !== '42883') {
      console.warn('[EventAttendanceService] RPC record_gate_exit error:', rpcErr);
      if (rpcErr.message && !rpcErr.message.includes('function public.record_gate_exit')) {
        throw new Error(rpcErr.message);
      }
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('42883') && !err.message.includes('function public.record_gate_exit') && !err.code) {
      throw err;
    }
  }

  // 2. Direct database fallback
  const now = new Date().toISOString();

  // Validate that delegate is currently inside
  let query = supabase
    .from('event_attendance')
    .select('*')
    .eq('status', 'IN')
    .is('exit_time', null);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recordIdOrInviteeId);
  if (isUuid) {
    query = query.or(`id.eq.${recordIdOrInviteeId},invitee_id.eq.${recordIdOrInviteeId}`);
  } else {
    query = query.eq('id', recordIdOrInviteeId);
  }

  const { data: records, error: queryErr } = await query;
  if (queryErr) {
    console.error('[EventAttendanceService] Find active session failed:', queryErr);
  }

  const rec = records?.[0];
  if (!rec) {
    throw new Error(
      'Invalid Scan OUT: Delegate is not currently inside venue. An active gate entry (IN) must exist before recording exit.'
    );
  }

  const entryTime = new Date(rec.entry_time).getTime();
  const exitTime = new Date(now).getTime();
  const durationMinutes = Math.max(0, Math.round((exitTime - entryTime) / (1000 * 60)));

  const updatePayload = {
    exit_time: now,
    status: 'OUT',
    exit_recorded_by: user.id,
    exit_recorded_by_name: user.full_name,
    exit_notes: notes ?? rec.exit_notes,
    scan_mode: scanMode,
    duration_minutes: durationMinutes,
    updated_at: now,
  };

  const { data: updated, error: updateErr } = await supabase
    .from('event_attendance')
    .update(updatePayload)
    .eq('id', rec.id)
    .select()
    .single();

  if (updateErr || !updated) {
    console.error(`[EventAttendanceService] Supabase UPDATE failed (${rec.id}):`, updateErr);
    throw new Error(`Failed to record event exit: ${updateErr?.message || 'Database error'} (${updateErr?.code || 'ERR'})`);
  }

  await recordAuditLog(user, 'EVENT_EXIT', 'event_attendance', rec.id, rec, updated);
  notifyDbUpdate();
  return updated as EventAttendanceRecord;
}

export async function correctEventAttendance(
  recordId: string,
  updates: Partial<EventAttendanceRecord>,
  user: UserProfile,
  reason?: string
): Promise<EventAttendanceRecord> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot correct event attendance.');
  }

  const now = new Date().toISOString();
  const { id: _id, invitee: _inv, created_at: _ca, ...cleanUpdates } = updates as any;

  const updatePayload: any = {
    ...cleanUpdates,
    is_corrected: true,
    corrected_by: user.id,
    correction_reason: reason || updates.correction_reason || 'Administrative manual correction',
    updated_at: now,
  };

  if (updatePayload.entry_time && updatePayload.exit_time) {
    const entryTime = new Date(updatePayload.entry_time).getTime();
    const exitTime = new Date(updatePayload.exit_time).getTime();
    if (exitTime >= entryTime) {
      updatePayload.duration_minutes = Math.round((exitTime - entryTime) / (1000 * 60));
    }
  }

  const { data: updated, error: updateErr } = await supabase
    .from('event_attendance')
    .update(updatePayload)
    .eq('id', recordId)
    .select()
    .single();

  if (updateErr || !updated) {
    console.error(`[EventAttendanceService] Supabase UPDATE failed (${recordId}):`, updateErr);
    throw new Error(`Failed to correct event attendance: ${updateErr?.message || 'Database error'} (${updateErr?.code || 'ERR'})`);
  }

  await recordAuditLog(user, 'MANUAL_CORRECTION', 'event_attendance', recordId, null, updated);
  notifyDbUpdate();
  return updated as EventAttendanceRecord;
}

// -------------------------------------------------------------
// MEETING ROOMS SERVICE
// -------------------------------------------------------------
export async function getMeetingRooms(): Promise<MeetingRoom[]> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot load meeting rooms.');
  }

  const { data, error } = await supabase
    .from('meeting_rooms')
    .select('*')
    .order('room_order', { ascending: true });

  if (error) {
    console.error('[MeetingRoomsService] Supabase SELECT failed:', error);
    throw new Error(`Failed to load meeting rooms: ${error.message} (${error.code})`);
  }

  return (data || []) as MeetingRoom[];
}

export async function createMeetingRoom(
  name: string,
  capacity = 100,
  user?: UserProfile
): Promise<MeetingRoom> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot create meeting room.');
  }

  const payload = {
    name: name.trim(),
    capacity,
    is_active: true,
  };

  const { data: inserted, error } = await supabase
    .from('meeting_rooms')
    .insert([payload])
    .select()
    .single();

  if (error || !inserted) {
    console.error('[MeetingRoomsService] Supabase INSERT failed:', error);
    throw new Error(`Failed to create meeting room: ${error?.message || 'Database error'} (${error?.code || 'ERR'})`);
  }

  if (user) {
    await recordAuditLog(user, 'INSERT', 'meeting_rooms', inserted.id, null, inserted);
  }
  notifyDbUpdate();
  return inserted as MeetingRoom;
}

export async function updateMeetingRoom(
  id: string,
  updates: Partial<MeetingRoom>,
  user: UserProfile
): Promise<MeetingRoom> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot update meeting room.');
  }

  const { id: _id, created_at: _ca, ...cleanUpdates } = updates as any;
  const payload = {
    ...cleanUpdates,
    updated_at: new Date().toISOString(),
  };

  const { data: updated, error } = await supabase
    .from('meeting_rooms')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error || !updated) {
    console.error(`[MeetingRoomsService] Supabase UPDATE failed (${id}):`, error);
    throw new Error(`Failed to update meeting room: ${error?.message || 'Record not found'} (${error?.code || 'ERR'})`);
  }

  await recordAuditLog(user, 'UPDATE', 'meeting_rooms', id, null, updated);
  notifyDbUpdate();
  return updated as MeetingRoom;
}

// -------------------------------------------------------------
// MEETING ATTENDANCE TRACKING SERVICE
// -------------------------------------------------------------
export async function getMeetingAttendanceRecords(
  inviteeId?: string,
  roomName?: string,
  date?: string
): Promise<MeetingAttendanceRecord[]> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot load meeting attendance.');
  }

  const inviteeMap = await getInviteeLookupMap();

  let query = supabase.from('meeting_attendance').select('*').order('in_time', { ascending: false });
  if (inviteeId) query = query.eq('invitee_id', inviteeId);
  if (roomName) query = query.eq('room_name', roomName);
  if (date) query = query.eq('meeting_date', date);

  const { data, error } = await query;
  if (error) {
    console.error('[MeetingAttendanceService] Supabase SELECT failed:', error);
    throw new Error(`Failed to load meeting attendance: ${error.message} (${error.code})`);
  }

  return ((data || []) as MeetingAttendanceRecord[]).map((r) => ({
    ...r,
    invitee: inviteeMap.get(r.invitee_id),
  }));
}

export async function recordMeetingEntry(
  inviteeId: string,
  roomName: string,
  sessionName = 'General Session',
  user: UserProfile,
  date?: string
): Promise<MeetingAttendanceRecord> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot record meeting entry.');
  }

  const now = new Date().toISOString();
  const meetingDate = date || now.slice(0, 10);

  const payload = {
    invitee_id: inviteeId,
    room_name: roomName,
    session_name: sessionName,
    meeting_date: meetingDate,
    in_time: now,
    status: 'IN',
    recorded_by: user.id,
    recorded_by_name: user.full_name,
  };

  const { data: inserted, error } = await supabase
    .from('meeting_attendance')
    .insert([payload])
    .select()
    .single();

  if (error || !inserted) {
    console.error('[MeetingAttendanceService] Supabase INSERT failed:', error);
    throw new Error(`Failed to record meeting entry: ${error?.message || 'Database error'} (${error?.code || 'ERR'})`);
  }

  await recordAuditLog(user, 'MEETING_ENTRY', 'meeting_attendance', inserted.id, null, inserted);
  notifyDbUpdate();
  return inserted as MeetingAttendanceRecord;
}

export async function recordMeetingExit(
  recordIdOrInviteeId: string,
  user: UserProfile,
  notes?: string
): Promise<MeetingAttendanceRecord> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot record meeting exit.');
  }

  const now = new Date().toISOString();

  // Find active session
  let query = supabase
    .from('meeting_attendance')
    .select('*')
    .eq('status', 'IN')
    .is('out_time', null);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recordIdOrInviteeId);
  if (isUuid) {
    query = query.or(`id.eq.${recordIdOrInviteeId},invitee_id.eq.${recordIdOrInviteeId}`);
  } else {
    query = query.eq('id', recordIdOrInviteeId);
  }

  const { data: records, error: queryErr } = await query;
  if (queryErr) {
    console.error('[MeetingAttendanceService] Find active session failed:', queryErr);
  }

  const rec = records?.[0];
  if (!rec) {
    throw new Error('No active meeting room session found for delegate');
  }

  const inTime = new Date(rec.in_time || rec.created_at).getTime();
  const outTime = new Date(now).getTime();
  const duration = Math.max(0, Math.round((outTime - inTime) / (1000 * 60)));

  const updatePayload = {
    out_time: now,
    status: 'OUT',
    notes: notes ?? rec.notes,
    duration_minutes: duration,
    updated_at: now,
  };

  const { data: updated, error: updateErr } = await supabase
    .from('meeting_attendance')
    .update(updatePayload)
    .eq('id', rec.id)
    .select()
    .single();

  if (updateErr || !updated) {
    console.error(`[MeetingAttendanceService] Supabase UPDATE failed (${rec.id}):`, updateErr);
    throw new Error(`Failed to record meeting exit: ${updateErr?.message || 'Database error'} (${updateErr?.code || 'ERR'})`);
  }

  await recordAuditLog(user, 'MEETING_EXIT', 'meeting_attendance', rec.id, rec, updated);
  notifyDbUpdate();
  return updated as MeetingAttendanceRecord;
}

// -------------------------------------------------------------
// UNIFIED ACTIVITY HISTORY TIMELINE
// -------------------------------------------------------------
export async function getInviteeActivityTimeline(inviteeId: string): Promise<UnifiedActivityEvent[]> {
  const events: UnifiedActivityEvent[] = [];

  // 1. Transportation
  const transports = await getTransportationRecords();
  const invTrans = transports.filter((t) => t.invitee_id === inviteeId);
  for (const t of invTrans) {
    const timestamp = t.journey_date && t.journey_time ? `${t.journey_date}T${t.journey_time}:00` : t.created_at;
    events.push({
      id: `trans-${t.id}`,
      invitee_id: inviteeId,
      type: 'transportation',
      title: `${t.journey_type === 'arrival' ? 'Arrival' : 'Departure'}: ${t.location_name}`,
      description: `${t.transport_mode} • ${t.transport_number || 'Scheduled'}${
        t.pickup_required ? ` • Pickup point: ${t.pickup_point || 'Station/Airport'}` : ''
      }${t.driver_name ? ` (Driver: ${t.driver_name})` : ''}`,
      timestamp,
      status: t.journey_type,
      badge_variant: t.journey_type === 'arrival' ? 'success' : 'secondary',
      source_id: t.id,
    });
  }

  // 2. Accommodation Registration
  const accommodations = await getAccommodations();
  const invAcc = accommodations.filter((a) => a.invitee_id === inviteeId);
  for (const a of invAcc) {
    if (a.hotel_registered && a.registered_at) {
      events.push({
        id: `acc-reg-${a.id}`,
        invitee_id: inviteeId,
        type: 'accommodation',
        title: `Hotel Check-in / Registration at ${a.hotel_name || 'Hotel'}`,
        description: `Room: ${a.room_number || 'TBD'} (${a.room_type || 'Standard'}) • Status: ${a.registration_status || 'Registered'}`,
        timestamp: a.registered_at,
        status: a.registration_status || 'Registered',
        badge_variant: 'success',
        source_id: a.id,
      });
    }
  }

  // 3. Event Reception Gate IN/OUT
  const eventAttendance = await getEventAttendanceRecords(inviteeId);
  for (const ea of eventAttendance) {
    events.push({
      id: `evt-in-${ea.id}`,
      invitee_id: inviteeId,
      type: 'reception',
      title: 'Event Gate Entry (IN)',
      description: `Entered venue on ${ea.event_date}${ea.entry_recorded_by_name ? ` (Recorded by ${ea.entry_recorded_by_name})` : ''}${
        ea.entry_notes ? ` • ${ea.entry_notes}` : ''
      }`,
      timestamp: ea.entry_time,
      status: 'IN',
      badge_variant: 'success',
      source_id: ea.id,
    });
    if (ea.exit_time) {
      events.push({
        id: `evt-out-${ea.id}`,
        invitee_id: inviteeId,
        type: 'reception',
        title: 'Event Gate Exit (OUT)',
        description: `Exited venue on ${ea.event_date}${ea.duration_minutes ? ` • Stay duration: ${ea.duration_minutes} mins` : ''}${
          ea.exit_recorded_by_name ? ` (Recorded by ${ea.exit_recorded_by_name})` : ''
        }`,
        timestamp: ea.exit_time,
        status: 'OUT',
        badge_variant: 'warning',
        source_id: ea.id,
      });
    }
  }

  // 4. Meeting Room Movements
  const meetingAttendance = await getMeetingAttendanceRecords(inviteeId);
  for (const ma of meetingAttendance) {
    const inTimestamp = ma.in_time || ma.entry_time || ma.created_at;
    events.push({
      id: `mtg-in-${ma.id}`,
      invitee_id: inviteeId,
      type: 'meeting',
      title: `Entered Room: ${ma.room_name}`,
      description: `Session: ${ma.session_name}${ma.recorded_by_name ? ` • Recorded by ${ma.recorded_by_name}` : ''}`,
      timestamp: inTimestamp,
      status: 'IN',
      badge_variant: 'info',
      source_id: ma.id,
    });
    if (ma.out_time || ma.exit_time) {
      const outTimestamp = ma.out_time || ma.exit_time || ma.updated_at;
      events.push({
        id: `mtg-out-${ma.id}`,
        invitee_id: inviteeId,
        type: 'meeting',
        title: `Exited Room: ${ma.room_name}`,
        description: `Session: ${ma.session_name}${ma.duration_minutes ? ` • Duration in room: ${ma.duration_minutes} mins` : ''}`,
        timestamp: outTimestamp,
        status: 'OUT',
        badge_variant: 'secondary',
        source_id: ma.id,
      });
    }
  }

  // Sort descending by timestamp
  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
