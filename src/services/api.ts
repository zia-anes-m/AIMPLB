import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { safeStorage } from '@/lib/safeStorage';
import {
  Invitee,
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
import {
  INITIAL_PROFILES,
  INITIAL_INVITEES,
  INITIAL_TRANSPORTATION,
  INITIAL_ACCOMMODATIONS,
  INITIAL_FOOD,
  INITIAL_RECEPTION,
  INITIAL_MEETING_HALL,
  INITIAL_AUDIT_LOGS,
  INITIAL_SYSTEM_SETTINGS,
  INITIAL_MEETING_ROOMS,
  INITIAL_EVENT_ATTENDANCE,
  INITIAL_MEETING_ATTENDANCE,
} from '@/lib/mockData';

// Storage keys for demo / local database persistence
const STORAGE_KEYS = {
  PROFILES: 'aimplb_db_profiles_v1',
  INVITEES: 'aimplb_db_invitees_v1',
  TRANSPORT: 'aimplb_db_transport_v1',
  ACCOMMODATION: 'aimplb_db_accommodation_v1',
  FOOD: 'aimplb_db_food_v1',
  RECEPTION: 'aimplb_db_reception_v1',
  MEETING_HALL: 'aimplb_db_meeting_hall_v1',
  AUDIT: 'aimplb_db_audit_v1',
  SETTINGS: 'aimplb_db_settings_v1',
  EVENT_ATTENDANCE: 'aimplb_db_event_attendance_v1',
  MEETING_ROOMS: 'aimplb_db_meeting_rooms_v1',
  MEETING_ATTENDANCE: 'aimplb_db_meeting_attendance_v1',
};

// Local store helpers with lazy initialization
function getLocalItem<T>(key: string, defaultData: T): T {
  try {
    const saved = safeStorage.getItem(key);
    if (!saved) {
      safeStorage.setItem(key, JSON.stringify(defaultData));
      return defaultData;
    }
    return JSON.parse(saved);
  } catch (err) {
    console.error(`Error reading ${key} from storage:`, err);
    return defaultData;
  }
}

let dbUpdateTimeout: ReturnType<typeof setTimeout> | null = null;
function notifyDbUpdate(): void {
  if (typeof window === 'undefined') return;
  if (dbUpdateTimeout) clearTimeout(dbUpdateTimeout);
  dbUpdateTimeout = setTimeout(() => {
    window.dispatchEvent(new Event('aimplb_db_update'));
  }, 25);
}

function setLocalItem<T>(key: string, data: T): void {
  try {
    safeStorage.setItem(key, JSON.stringify(data));
    // Trigger debounced event so reactive components update smoothly without flood
    notifyDbUpdate();
  } catch (err) {
    console.error(`Error writing ${key} to storage:`, err);
  }
}

// Global audit logger helper
function recordLocalAudit(
  user: UserProfile | null,
  action: string,
  table_name: string,
  record_id: string,
  previous_data?: any,
  new_data?: any
) {
  const audits = getLocalItem<AuditLog[]>(STORAGE_KEYS.AUDIT, INITIAL_AUDIT_LOGS);
  const newLog: AuditLog = {
    id: 'audit-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    user_id: user?.id || 'system',
    user_name: user ? `${user.full_name} (${user.role})` : 'System',
    action,
    table_name,
    record_id,
    previous_data,
    new_data,
    created_at: new Date().toISOString(),
  };
  setLocalItem(STORAGE_KEYS.AUDIT, [newLog, ...audits]);
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
    city: '[Restricted]',
    state: '[Restricted]',
    address: '[Restricted]',
  };
}

export async function getRawInvitees(): Promise<Invitee[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('invitees')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) return data as Invitee[];
    console.warn('Supabase query failed, falling back to local database:', error);
  }
  return getLocalItem<Invitee[]>(STORAGE_KEYS.INVITEES, INITIAL_INVITEES);
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
  const rawList = await getRawInvitees();
  const found = rawList.find((i) => i.id === id) || null;
  if (!found) return null;
  const role = getCurrentSessionUserRole();
  if (role === 'Admin') {
    return found;
  }
  return redactInviteeForNonAdmin(found);
}

export async function checkDuplicateInvitee(
  phone: string,
  fullName: string,
  excludeId?: string
): Promise<{ isDuplicate: boolean; matchedBy: 'phone' | 'name' | null; existing?: Invitee }> {
  const list = await getRawInvitees();
  const cleanPhone = phone.replace(/\D/g, '');
  const cleanName = fullName.trim().toLowerCase();

  for (const inv of list) {
    if (excludeId && inv.id === excludeId) continue;

    const existingCleanPhone = inv.phone.replace(/\D/g, '');
    if (cleanPhone && existingCleanPhone && cleanPhone === existingCleanPhone) {
      return { isDuplicate: true, matchedBy: 'phone', existing: inv };
    }

    if (cleanName && inv.full_name.trim().toLowerCase() === cleanName) {
      return { isDuplicate: true, matchedBy: 'name', existing: inv };
    }
  }

  return { isDuplicate: false, matchedBy: null };
}

export async function createInvitee(
  data: Omit<Invitee, 'id' | 'invitee_code' | 'created_at' | 'updated_at'>,
  user: UserProfile
): Promise<Invitee> {
  if (isSupabaseConfigured) {
    const { data: inserted, error } = await supabase
      .from('invitees')
      .insert([{ ...data, created_by: user.id }])
      .select()
      .single();
    if (!error && inserted) return inserted as Invitee;
    console.warn('Supabase insert failed, storing locally:', error);
  }

  const list = getLocalItem<Invitee[]>(STORAGE_KEYS.INVITEES, INITIAL_INVITEES);
  const nextNum = list.length + 1;
  const newCode = `AIM-INV-${String(nextNum).padStart(4, '0')}`;
  const now = new Date().toISOString();

  const newInvitee: Invitee = {
    ...data,
    id: 'inv-' + Date.now(),
    invitee_code: newCode,
    created_by: user.id,
    created_at: now,
    updated_at: now,
  };

  setLocalItem(STORAGE_KEYS.INVITEES, [newInvitee, ...list]);
  recordLocalAudit(user, 'INSERT', 'invitees', newInvitee.id, null, newInvitee);
  return newInvitee;
}

export async function updateInvitee(
  id: string,
  data: Partial<Invitee>,
  user: UserProfile
): Promise<Invitee> {
  if (isSupabaseConfigured) {
    const { data: updated, error } = await supabase
      .from('invitees')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (!error && updated) return updated as Invitee;
  }

  const list = getLocalItem<Invitee[]>(STORAGE_KEYS.INVITEES, INITIAL_INVITEES);
  const idx = list.findIndex((i) => i.id === id);
  if (idx === -1) throw new Error('Invitee not found');

  const old = list[idx];
  const updatedInv: Invitee = {
    ...old,
    ...data,
    updated_at: new Date().toISOString(),
  };

  list[idx] = updatedInv;
  setLocalItem(STORAGE_KEYS.INVITEES, [...list]);
  recordLocalAudit(user, 'UPDATE', 'invitees', id, old, updatedInv);
  return updatedInv;
}

export async function deleteInvitee(id: string, user: UserProfile): Promise<boolean> {
  if (user.role !== 'Admin') {
    throw new Error('Unauthorized: Only Admin can delete invitees');
  }

  if (isSupabaseConfigured) {
    const { error } = await supabase.from('invitees').delete().eq('id', id);
    if (!error) return true;
  }

  const list = getLocalItem<Invitee[]>(STORAGE_KEYS.INVITEES, INITIAL_INVITEES);
  const existing = list.find((i) => i.id === id);
  const filtered = list.filter((i) => i.id !== id);
  setLocalItem(STORAGE_KEYS.INVITEES, filtered);

  // Cascade delete in associated local tables
  const trans = getLocalItem<TransportationRecord[]>(STORAGE_KEYS.TRANSPORT, INITIAL_TRANSPORTATION).filter((t) => t.invitee_id !== id);
  setLocalItem(STORAGE_KEYS.TRANSPORT, trans);

  const accs = getLocalItem<AccommodationRecord[]>(STORAGE_KEYS.ACCOMMODATION, INITIAL_ACCOMMODATIONS).filter((a) => a.invitee_id !== id);
  setLocalItem(STORAGE_KEYS.ACCOMMODATION, accs);

  const foods = getLocalItem<FoodRecord[]>(STORAGE_KEYS.FOOD, INITIAL_FOOD).filter((f) => f.invitee_id !== id);
  setLocalItem(STORAGE_KEYS.FOOD, foods);

  const recs = getLocalItem<ReceptionRecord[]>(STORAGE_KEYS.RECEPTION, INITIAL_RECEPTION).filter((r) => r.invitee_id !== id);
  setLocalItem(STORAGE_KEYS.RECEPTION, recs);

  const halls = getLocalItem<MeetingHallRecord[]>(STORAGE_KEYS.MEETING_HALL, INITIAL_MEETING_HALL).filter((h) => h.invitee_id !== id);
  setLocalItem(STORAGE_KEYS.MEETING_HALL, halls);

  recordLocalAudit(user, 'DELETE', 'invitees', id, existing, null);
  return true;
}

// -------------------------------------------------------------
// TRANSPORTATION SERVICE
// -------------------------------------------------------------
export async function getTransportationRecords(): Promise<TransportationRecord[]> {
  const invitees = await getInvitees();
  const inviteeMap = new Map(invitees.map((i) => [i.id, i]));

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('transportation')
      .select('*')
      .order('journey_date', { ascending: true });
    if (!error && data) {
      return (data as TransportationRecord[]).map((t) => ({
        ...t,
        invitee: inviteeMap.get(t.invitee_id),
      }));
    }
  }

  const local = getLocalItem<TransportationRecord[]>(STORAGE_KEYS.TRANSPORT, INITIAL_TRANSPORTATION);
  return local.map((t) => ({
    ...t,
    invitee: inviteeMap.get(t.invitee_id),
  }));
}

export async function createTransportation(
  data: Omit<TransportationRecord, 'id' | 'created_at' | 'updated_at'>,
  user: UserProfile
): Promise<TransportationRecord> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured) {
    const { data: inserted, error } = await supabase
      .from('transportation')
      .insert([{ ...data, created_by: user.id, updated_by: user.id }])
      .select()
      .single();
    if (!error && inserted) return inserted as TransportationRecord;
  }

  const list = getLocalItem<TransportationRecord[]>(STORAGE_KEYS.TRANSPORT, INITIAL_TRANSPORTATION);
  const newRec: TransportationRecord = {
    ...data,
    id: 'trans-' + Date.now(),
    created_by: user.id,
    updated_by: user.id,
    created_at: now,
    updated_at: now,
  };
  setLocalItem(STORAGE_KEYS.TRANSPORT, [newRec, ...list]);
  recordLocalAudit(user, 'INSERT', 'transportation', newRec.id, null, newRec);
  return newRec;
}

export async function updateTransportation(
  id: string,
  data: Partial<TransportationRecord>,
  user: UserProfile
): Promise<TransportationRecord> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured) {
    const { data: updated, error } = await supabase
      .from('transportation')
      .update({ ...data, updated_by: user.id, updated_at: now })
      .eq('id', id)
      .select()
      .single();
    if (!error && updated) return updated as TransportationRecord;
  }

  const list = getLocalItem<TransportationRecord[]>(STORAGE_KEYS.TRANSPORT, INITIAL_TRANSPORTATION);
  const idx = list.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error('Transportation record not found');

  const old = list[idx];
  const updatedRec: TransportationRecord = {
    ...old,
    ...data,
    updated_by: user.id,
    updated_at: now,
  };
  list[idx] = updatedRec;
  setLocalItem(STORAGE_KEYS.TRANSPORT, [...list]);
  recordLocalAudit(user, 'UPDATE', 'transportation', id, old, updatedRec);
  return updatedRec;
}

export async function deleteTransportation(id: string, user: UserProfile): Promise<boolean> {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('transportation').delete().eq('id', id);
    if (!error) return true;
  }
  const list = getLocalItem<TransportationRecord[]>(STORAGE_KEYS.TRANSPORT, INITIAL_TRANSPORTATION);
  const existing = list.find((t) => t.id === id);
  setLocalItem(
    STORAGE_KEYS.TRANSPORT,
    list.filter((t) => t.id !== id)
  );
  recordLocalAudit(user, 'DELETE', 'transportation', id, existing, null);
  return true;
}

// -------------------------------------------------------------
// ACCOMMODATION SERVICE & ROOM CONFLICT CHECK
// -------------------------------------------------------------
export async function getAccommodations(): Promise<AccommodationRecord[]> {
  const invitees = await getInvitees();
  const inviteeMap = new Map(invitees.map((i) => [i.id, i]));

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('accommodations')
      .select('*')
      .order('check_in_date', { ascending: true });
    if (!error && data) {
      return (data as AccommodationRecord[]).map((a) => ({
        ...a,
        invitee: inviteeMap.get(a.invitee_id),
      }));
    }
  }

  const local = getLocalItem<AccommodationRecord[]>(STORAGE_KEYS.ACCOMMODATION, INITIAL_ACCOMMODATIONS);
  return local.map((a) => ({
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

  const list = await getAccommodations();
  const inDate = new Date(checkInDate).getTime();
  const outDate = new Date(checkOutDate).getTime();

  for (const acc of list) {
    if (excludeRecordId && acc.id === excludeRecordId) continue;
    if (
      acc.hotel_name?.toLowerCase().trim() === hotelName.toLowerCase().trim() &&
      acc.room_number?.toLowerCase().trim() === roomNumber.toLowerCase().trim() &&
      acc.check_in_date &&
      acc.check_out_date
    ) {
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

  const now = new Date().toISOString();
  if (isSupabaseConfigured) {
    const { data: inserted, error } = await supabase
      .from('accommodations')
      .insert([{ ...data, created_by: user.id, updated_by: user.id }])
      .select()
      .single();
    if (!error && inserted) return inserted as AccommodationRecord;
  }

  const list = getLocalItem<AccommodationRecord[]>(STORAGE_KEYS.ACCOMMODATION, INITIAL_ACCOMMODATIONS);
  const newRec: AccommodationRecord = {
    ...data,
    id: 'acc-' + Date.now(),
    created_by: user.id,
    updated_by: user.id,
    created_at: now,
    updated_at: now,
  };
  setLocalItem(STORAGE_KEYS.ACCOMMODATION, [newRec, ...list]);
  recordLocalAudit(user, 'INSERT', 'accommodations', newRec.id, null, newRec);
  return newRec;
}

export async function updateAccommodation(
  id: string,
  data: Partial<AccommodationRecord>,
  user: UserProfile,
  allowShared = false
): Promise<AccommodationRecord> {
  const list = getLocalItem<AccommodationRecord[]>(STORAGE_KEYS.ACCOMMODATION, INITIAL_ACCOMMODATIONS);
  const idx = list.findIndex((a) => a.id === id);
  if (idx === -1) throw new Error('Accommodation record not found');
  const old = list[idx];

  const hotel = data.hotel_name ?? old.hotel_name;
  const room = data.room_number ?? old.room_number;
  const checkIn = data.check_in_date ?? old.check_in_date;
  const checkOut = data.check_out_date ?? old.check_out_date;

  if (!allowShared && hotel && room && checkIn && checkOut) {
    const conflict = await checkRoomConflict(hotel, room, checkIn, checkOut, id);
    if (conflict.hasConflict) {
      throw new Error(
        `Room conflict: ${room} in ${hotel} is already assigned to ${conflict.conflictingWith?.invitee?.full_name || 'another invitee'} during this time.`
      );
    }
  }

  const now = new Date().toISOString();
  if (isSupabaseConfigured) {
    const { data: updated, error } = await supabase
      .from('accommodations')
      .update({ ...data, updated_by: user.id, updated_at: now })
      .eq('id', id)
      .select()
      .single();
    if (!error && updated) return updated as AccommodationRecord;
  }

  const updatedRec: AccommodationRecord = {
    ...old,
    ...data,
    updated_by: user.id,
    updated_at: now,
  };
  list[idx] = updatedRec;
  setLocalItem(STORAGE_KEYS.ACCOMMODATION, [...list]);
  recordLocalAudit(user, 'UPDATE', 'accommodations', id, old, updatedRec);
  return updatedRec;
}

export async function deleteAccommodation(id: string, user: UserProfile): Promise<boolean> {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('accommodations').delete().eq('id', id);
    if (!error) return true;
  }
  const list = getLocalItem<AccommodationRecord[]>(STORAGE_KEYS.ACCOMMODATION, INITIAL_ACCOMMODATIONS);
  const existing = list.find((a) => a.id === id);
  setLocalItem(
    STORAGE_KEYS.ACCOMMODATION,
    list.filter((a) => a.id !== id)
  );
  recordLocalAudit(user, 'DELETE', 'accommodations', id, existing, null);
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
      registered_at: undefined,
      registered_by: undefined,
      special_requirements: reason
        ? `Registration undone by ${user.full_name}: ${reason}`
        : undefined,
    },
    user,
    true
  );
  recordLocalAudit(user, 'UNDO_REGISTRATION', 'accommodations', accommodationId, null, { reason });
  return updated;
}

// -------------------------------------------------------------
// FOOD SERVICE
// -------------------------------------------------------------
export async function getFoodRecords(): Promise<FoodRecord[]> {
  const invitees = await getInvitees();
  const inviteeMap = new Map(invitees.map((i) => [i.id, i]));

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('food_arrangements')
      .select('*')
      .order('meal_date', { ascending: true });
    if (!error && data) {
      return (data as FoodRecord[]).map((f) => ({
        ...f,
        invitee: inviteeMap.get(f.invitee_id),
      }));
    }
  }

  const local = getLocalItem<FoodRecord[]>(STORAGE_KEYS.FOOD, INITIAL_FOOD);
  return local.map((f) => ({
    ...f,
    invitee: inviteeMap.get(f.invitee_id),
  }));
}

export async function createFoodRecord(
  data: Omit<FoodRecord, 'id' | 'created_at' | 'updated_at'>,
  user: UserProfile
): Promise<FoodRecord> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured) {
    const { data: inserted, error } = await supabase
      .from('food_arrangements')
      .insert([{ ...data, created_by: user.id, updated_by: user.id }])
      .select()
      .single();
    if (!error && inserted) return inserted as FoodRecord;
  }

  const list = getLocalItem<FoodRecord[]>(STORAGE_KEYS.FOOD, INITIAL_FOOD);
  const newRec: FoodRecord = {
    ...data,
    id: 'food-' + Date.now(),
    created_by: user.id,
    updated_by: user.id,
    created_at: now,
    updated_at: now,
  };
  setLocalItem(STORAGE_KEYS.FOOD, [newRec, ...list]);
  recordLocalAudit(user, 'INSERT', 'food_arrangements', newRec.id, null, newRec);
  return newRec;
}

export async function updateFoodRecord(
  id: string,
  data: Partial<FoodRecord>,
  user: UserProfile
): Promise<FoodRecord> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured) {
    const { data: updated, error } = await supabase
      .from('food_arrangements')
      .update({ ...data, updated_by: user.id, updated_at: now })
      .eq('id', id)
      .select()
      .single();
    if (!error && updated) return updated as FoodRecord;
  }

  const list = getLocalItem<FoodRecord[]>(STORAGE_KEYS.FOOD, INITIAL_FOOD);
  const idx = list.findIndex((f) => f.id === id);
  if (idx === -1) throw new Error('Food record not found');

  const old = list[idx];
  const updatedRec: FoodRecord = {
    ...old,
    ...data,
    updated_by: user.id,
    updated_at: now,
  };
  list[idx] = updatedRec;
  setLocalItem(STORAGE_KEYS.FOOD, [...list]);
  recordLocalAudit(user, 'UPDATE', 'food_arrangements', id, old, updatedRec);
  return updatedRec;
}

export async function deleteFoodRecord(id: string, user: UserProfile): Promise<boolean> {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('food_arrangements').delete().eq('id', id);
    if (!error) return true;
  }
  const list = getLocalItem<FoodRecord[]>(STORAGE_KEYS.FOOD, INITIAL_FOOD);
  const existing = list.find((f) => f.id === id);
  setLocalItem(
    STORAGE_KEYS.FOOD,
    list.filter((f) => f.id !== id)
  );
  recordLocalAudit(user, 'DELETE', 'food_arrangements', id, existing, null);
  return true;
}

// -------------------------------------------------------------
// RECEPTION SERVICE
// -------------------------------------------------------------
export async function getReceptionRecords(): Promise<ReceptionRecord[]> {
  const invitees = await getInvitees();
  const inviteeMap = new Map(invitees.map((i) => [i.id, i]));

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('reception')
      .select('*')
      .order('expected_arrival', { ascending: true });
    if (!error && data) {
      return (data as ReceptionRecord[]).map((r) => ({
        ...r,
        invitee: inviteeMap.get(r.invitee_id),
      }));
    }
  }

  const local = getLocalItem<ReceptionRecord[]>(STORAGE_KEYS.RECEPTION, INITIAL_RECEPTION);
  return local.map((r) => ({
    ...r,
    invitee: inviteeMap.get(r.invitee_id),
  }));
}

export async function createReceptionRecord(
  data: Omit<ReceptionRecord, 'id' | 'created_at' | 'updated_at'>,
  user: UserProfile
): Promise<ReceptionRecord> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured) {
    const { data: inserted, error } = await supabase
      .from('reception')
      .insert([{ ...data, created_by: user.id, updated_by: user.id }])
      .select()
      .single();
    if (!error && inserted) return inserted as ReceptionRecord;
  }

  const list = getLocalItem<ReceptionRecord[]>(STORAGE_KEYS.RECEPTION, INITIAL_RECEPTION);
  const newRec: ReceptionRecord = {
    ...data,
    id: 'rec-' + Date.now(),
    created_by: user.id,
    updated_by: user.id,
    created_at: now,
    updated_at: now,
  };
  setLocalItem(STORAGE_KEYS.RECEPTION, [newRec, ...list]);
  recordLocalAudit(user, 'INSERT', 'reception', newRec.id, null, newRec);
  return newRec;
}

export async function updateReceptionRecord(
  id: string,
  data: Partial<ReceptionRecord>,
  user: UserProfile
): Promise<ReceptionRecord> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured) {
    const { data: updated, error } = await supabase
      .from('reception')
      .update({ ...data, updated_by: user.id, updated_at: now })
      .eq('id', id)
      .select()
      .single();
    if (!error && updated) return updated as ReceptionRecord;
  }

  const list = getLocalItem<ReceptionRecord[]>(STORAGE_KEYS.RECEPTION, INITIAL_RECEPTION);
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error('Reception record not found');

  const old = list[idx];
  const updatedRec: ReceptionRecord = {
    ...old,
    ...data,
    updated_by: user.id,
    updated_at: now,
  };
  list[idx] = updatedRec;
  setLocalItem(STORAGE_KEYS.RECEPTION, [...list]);
  recordLocalAudit(user, 'UPDATE', 'reception', id, old, updatedRec);
  return updatedRec;
}

// -------------------------------------------------------------
// MEETING HALL SERVICE & SEAT CONFLICT CHECK
// -------------------------------------------------------------
export async function getMeetingHallRecords(): Promise<MeetingHallRecord[]> {
  const invitees = await getInvitees();
  const inviteeMap = new Map(invitees.map((i) => [i.id, i]));

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('meeting_hall_assignments')
      .select('*')
      .order('meeting_hall', { ascending: true });
    if (!error && data) {
      return (data as MeetingHallRecord[]).map((m) => ({
        ...m,
        invitee: inviteeMap.get(m.invitee_id),
      }));
    }
  }

  const local = getLocalItem<MeetingHallRecord[]>(STORAGE_KEYS.MEETING_HALL, INITIAL_MEETING_HALL);
  return local.map((m) => ({
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
  const conflict = await checkSeatConflict(data.meeting_hall, data.seating_section, data.seat_number);
  if (conflict.hasConflict) {
    throw new Error(
      `Seat duplicate: Seat ${data.seat_number} in ${data.seating_section} (${data.meeting_hall}) is already assigned to ${conflict.conflictingWith?.invitee?.full_name || 'another invitee'}.`
    );
  }

  const now = new Date().toISOString();
  if (isSupabaseConfigured) {
    const { data: inserted, error } = await supabase
      .from('meeting_hall_assignments')
      .insert([{ ...data, created_by: user.id, updated_by: user.id }])
      .select()
      .single();
    if (!error && inserted) return inserted as MeetingHallRecord;
  }

  const list = getLocalItem<MeetingHallRecord[]>(STORAGE_KEYS.MEETING_HALL, INITIAL_MEETING_HALL);
  const newRec: MeetingHallRecord = {
    ...data,
    id: 'hall-' + Date.now(),
    created_by: user.id,
    updated_by: user.id,
    created_at: now,
    updated_at: now,
  };
  setLocalItem(STORAGE_KEYS.MEETING_HALL, [newRec, ...list]);
  recordLocalAudit(user, 'INSERT', 'meeting_hall_assignments', newRec.id, null, newRec);
  return newRec;
}

export async function updateMeetingHallRecord(
  id: string,
  data: Partial<MeetingHallRecord>,
  user: UserProfile
): Promise<MeetingHallRecord> {
  const list = getLocalItem<MeetingHallRecord[]>(STORAGE_KEYS.MEETING_HALL, INITIAL_MEETING_HALL);
  const idx = list.findIndex((m) => m.id === id);
  if (idx === -1) throw new Error('Meeting hall record not found');
  const old = list[idx];

  const hall = data.meeting_hall ?? old.meeting_hall;
  const section = data.seating_section ?? old.seating_section;
  const seat = data.seat_number ?? old.seat_number;

  const conflict = await checkSeatConflict(hall, section, seat, id);
  if (conflict.hasConflict) {
    throw new Error(
      `Seat duplicate: Seat ${seat} in ${section} (${hall}) is already assigned to ${conflict.conflictingWith?.invitee?.full_name || 'another invitee'}.`
    );
  }

  const now = new Date().toISOString();
  if (isSupabaseConfigured) {
    const { data: updated, error } = await supabase
      .from('meeting_hall_assignments')
      .update({ ...data, updated_by: user.id, updated_at: now })
      .eq('id', id)
      .select()
      .single();
    if (!error && updated) return updated as MeetingHallRecord;
  }

  const updatedRec: MeetingHallRecord = {
    ...old,
    ...data,
    updated_by: user.id,
    updated_at: now,
  };
  list[idx] = updatedRec;
  setLocalItem(STORAGE_KEYS.MEETING_HALL, [...list]);
  recordLocalAudit(user, 'UPDATE', 'meeting_hall_assignments', id, old, updatedRec);
  return updatedRec;
}

export async function deleteMeetingHallRecord(id: string, user: UserProfile): Promise<boolean> {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('meeting_hall_assignments').delete().eq('id', id);
    if (!error) return true;
  }
  const list = getLocalItem<MeetingHallRecord[]>(STORAGE_KEYS.MEETING_HALL, INITIAL_MEETING_HALL);
  const existing = list.find((m) => m.id === id);
  setLocalItem(
    STORAGE_KEYS.MEETING_HALL,
    list.filter((m) => m.id !== id)
  );
  recordLocalAudit(user, 'DELETE', 'meeting_hall_assignments', id, existing, null);
  return true;
}

// -------------------------------------------------------------
// VOLUNTEER & PROFILE MANAGEMENT (Admin)
// -------------------------------------------------------------
export async function getProfiles(): Promise<UserProfile[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) return data as UserProfile[];
  }
  return getLocalItem<UserProfile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
}

export async function createVolunteer(
  data: {
    full_name: string;
    username: string;
    role: UserRole;
    department: string;
  },
  adminUser: UserProfile
): Promise<UserProfile> {
  if (adminUser.role !== 'Admin') {
    throw new Error('Unauthorized: Only Admin can create volunteers');
  }

  const list = getLocalItem<UserProfile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
  if (list.some((u) => u.username.toLowerCase() === data.username.toLowerCase())) {
    throw new Error('A user with this username already exists');
  }

  const now = new Date().toISOString();
  const newProfile: UserProfile = {
    id: 'user-' + Date.now(),
    ...data,
    is_active: true,
    created_at: now,
    updated_at: now,
  };

  setLocalItem(STORAGE_KEYS.PROFILES, [newProfile, ...list]);
  recordLocalAudit(adminUser, 'INSERT', 'profiles', newProfile.id, null, newProfile);
  return newProfile;
}

export async function updateVolunteer(
  id: string,
  data: Partial<UserProfile>,
  adminUser: UserProfile
): Promise<UserProfile> {
  if (adminUser.role !== 'Admin') {
    throw new Error('Unauthorized: Only Admin can update volunteers');
  }

  const list = getLocalItem<UserProfile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
  const idx = list.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error('User not found');

  const old = list[idx];
  const updated: UserProfile = {
    ...old,
    ...data,
    updated_at: new Date().toISOString(),
  };

  list[idx] = updated;
  setLocalItem(STORAGE_KEYS.PROFILES, [...list]);
  recordLocalAudit(adminUser, 'UPDATE', 'profiles', id, old, updated);
  return updated;
}

// -------------------------------------------------------------
// AUDIT LOGS & SETTINGS
// -------------------------------------------------------------
export async function getAuditLogs(): Promise<AuditLog[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (!error && data) return data as AuditLog[];
  }
  return getLocalItem<AuditLog[]>(STORAGE_KEYS.AUDIT, INITIAL_AUDIT_LOGS);
}

export async function getSystemSettings(): Promise<SystemSettings[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('system_settings').select('*');
    if (!error && data) return data as SystemSettings[];
  }
  return getLocalItem<SystemSettings[]>(STORAGE_KEYS.SETTINGS, INITIAL_SYSTEM_SETTINGS);
}

export async function updateSystemSetting(
  key: string,
  value: any,
  adminUser: UserProfile
): Promise<void> {
  if (adminUser.role !== 'Admin') {
    throw new Error('Unauthorized: Only Admin can modify system settings');
  }

  if (isSupabaseConfigured) {
    await supabase
      .from('system_settings')
      .upsert({ setting_key: key, setting_value: value, updated_at: new Date().toISOString() });
  }

  const list = getLocalItem<SystemSettings[]>(STORAGE_KEYS.SETTINGS, INITIAL_SYSTEM_SETTINGS);
  const idx = list.findIndex((s) => s.setting_key === key);
  const now = new Date().toISOString();

  if (idx >= 0) {
    const old = list[idx];
    list[idx] = { ...old, setting_value: value, updated_at: now };
    recordLocalAudit(adminUser, 'UPDATE', 'system_settings', key, old, list[idx]);
  } else {
    const newSett: SystemSettings = {
      id: 'sett-' + Date.now(),
      setting_key: key,
      setting_value: value,
      updated_at: now,
    };
    list.push(newSett);
    recordLocalAudit(adminUser, 'INSERT', 'system_settings', key, null, newSett);
  }

  setLocalItem(STORAGE_KEYS.SETTINGS, [...list]);
}

// -------------------------------------------------------------
// EVENT ATTENDANCE (GATE IN/OUT) SERVICE
// -------------------------------------------------------------
export async function getEventAttendanceRecords(
  inviteeId?: string,
  eventDate?: string
): Promise<EventAttendanceRecord[]> {
  const invitees = await getInvitees();
  const inviteeMap = new Map(invitees.map((i) => [i.id, i]));

  if (isSupabaseConfigured) {
    let query = supabase.from('event_attendance').select('*').order('entry_time', { ascending: false });
    if (inviteeId) query = query.eq('invitee_id', inviteeId);
    if (eventDate) query = query.eq('event_date', eventDate);
    const { data, error } = await query;
    if (!error && data) {
      return (data as EventAttendanceRecord[]).map((r) => ({
        ...r,
        invitee: inviteeMap.get(r.invitee_id),
      }));
    }
  }

  let list = getLocalItem<EventAttendanceRecord[]>(STORAGE_KEYS.EVENT_ATTENDANCE, INITIAL_EVENT_ATTENDANCE);
  if (inviteeId) list = list.filter((r) => r.invitee_id === inviteeId);
  if (eventDate) list = list.filter((r) => r.event_date === eventDate);
  return list.map((r) => ({
    ...r,
    invitee: inviteeMap.get(r.invitee_id),
  }));
}

export async function recordEventEntry(
  inviteeId: string,
  user: UserProfile,
  eventDate?: string,
  notes?: string
): Promise<EventAttendanceRecord> {
  const now = new Date().toISOString();
  const date = eventDate || now.slice(0, 10);

  const newRec: EventAttendanceRecord = {
    id: 'evt-att-' + Date.now(),
    invitee_id: inviteeId,
    event_date: date,
    entry_time: now,
    status: 'IN',
    entry_recorded_by: user.id,
    entry_recorded_by_name: user.full_name,
    entry_notes: notes,
    created_at: now,
    updated_at: now,
  };

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('event_attendance').insert([newRec]).select().single();
    if (!error && data) return data as EventAttendanceRecord;
  }

  const list = getLocalItem<EventAttendanceRecord[]>(STORAGE_KEYS.EVENT_ATTENDANCE, INITIAL_EVENT_ATTENDANCE);
  setLocalItem(STORAGE_KEYS.EVENT_ATTENDANCE, [newRec, ...list]);
  recordLocalAudit(user, 'EVENT_ENTRY', 'event_attendance', newRec.id, null, newRec);
  return newRec;
}

export async function recordEventExit(
  recordIdOrInviteeId: string,
  user: UserProfile,
  notes?: string
): Promise<EventAttendanceRecord> {
  const now = new Date().toISOString();
  const list = getLocalItem<EventAttendanceRecord[]>(STORAGE_KEYS.EVENT_ATTENDANCE, INITIAL_EVENT_ATTENDANCE);

  // Find open session
  let rec = list.find((r) => r.id === recordIdOrInviteeId);
  if (!rec) {
    rec = list.find((r) => r.invitee_id === recordIdOrInviteeId && r.status === 'IN' && !r.exit_time);
  }
  if (!rec) {
    // If no open session found, find latest session for this invitee
    rec = list.find((r) => r.invitee_id === recordIdOrInviteeId);
  }
  if (!rec) throw new Error('No active gate entry session found for this delegate');

  const entryTime = new Date(rec.entry_time).getTime();
  const exitTime = new Date(now).getTime();
  const durationMinutes = Math.max(0, Math.round((exitTime - entryTime) / (1000 * 60)));

  const updated: EventAttendanceRecord = {
    ...rec,
    exit_time: now,
    status: 'OUT',
    exit_recorded_by: user.id,
    exit_recorded_by_name: user.full_name,
    exit_notes: notes ?? rec.exit_notes,
    duration_minutes: durationMinutes,
    updated_at: now,
  };

  if (isSupabaseConfigured) {
    await supabase.from('event_attendance').update(updated).eq('id', rec.id);
  }

  const idx = list.findIndex((r) => r.id === rec!.id);
  if (idx !== -1) {
    list[idx] = updated;
    setLocalItem(STORAGE_KEYS.EVENT_ATTENDANCE, [...list]);
  }
  recordLocalAudit(user, 'EVENT_EXIT', 'event_attendance', rec.id, rec, updated);
  return updated;
}

export async function correctEventAttendance(
  recordId: string,
  updates: Partial<EventAttendanceRecord>,
  user: UserProfile
): Promise<EventAttendanceRecord> {
  const now = new Date().toISOString();
  const list = getLocalItem<EventAttendanceRecord[]>(STORAGE_KEYS.EVENT_ATTENDANCE, INITIAL_EVENT_ATTENDANCE);
  const idx = list.findIndex((r) => r.id === recordId);
  if (idx === -1) throw new Error('Event attendance record not found');

  const old = list[idx];
  const updated: EventAttendanceRecord = {
    ...old,
    ...updates,
    updated_at: now,
  };

  if (updated.entry_time && updated.exit_time) {
    const entryTime = new Date(updated.entry_time).getTime();
    const exitTime = new Date(updated.exit_time).getTime();
    if (exitTime >= entryTime) {
      updated.duration_minutes = Math.round((exitTime - entryTime) / (1000 * 60));
    }
  }

  if (isSupabaseConfigured) {
    await supabase.from('event_attendance').update(updated).eq('id', recordId);
  }

  list[idx] = updated;
  setLocalItem(STORAGE_KEYS.EVENT_ATTENDANCE, [...list]);
  recordLocalAudit(user, 'UPDATE', 'event_attendance', recordId, old, updated);
  return updated;
}

// -------------------------------------------------------------
// MEETING ROOMS SERVICE
// -------------------------------------------------------------
export async function getMeetingRooms(): Promise<MeetingRoom[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('meeting_rooms').select('*').order('created_at', { ascending: true });
    if (!error && data) return data as MeetingRoom[];
  }
  return getLocalItem<MeetingRoom[]>(STORAGE_KEYS.MEETING_ROOMS, INITIAL_MEETING_ROOMS);
}

export async function createMeetingRoom(
  name: string,
  capacity = 100,
  user?: UserProfile
): Promise<MeetingRoom> {
  const now = new Date().toISOString();
  const newRoom: MeetingRoom = {
    id: 'room-' + Date.now(),
    name: name.trim(),
    capacity,
    is_active: true,
    created_at: now,
    updated_at: now,
  };

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('meeting_rooms').insert([newRoom]).select().single();
    if (!error && data) return data as MeetingRoom;
  }

  const list = getLocalItem<MeetingRoom[]>(STORAGE_KEYS.MEETING_ROOMS, INITIAL_MEETING_ROOMS);
  setLocalItem(STORAGE_KEYS.MEETING_ROOMS, [...list, newRoom]);
  if (user) recordLocalAudit(user, 'INSERT', 'meeting_rooms', newRoom.id, null, newRoom);
  return newRoom;
}

export async function updateMeetingRoom(
  id: string,
  updates: Partial<MeetingRoom>,
  user: UserProfile
): Promise<MeetingRoom> {
  const now = new Date().toISOString();
  const list = getLocalItem<MeetingRoom[]>(STORAGE_KEYS.MEETING_ROOMS, INITIAL_MEETING_ROOMS);
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error('Meeting room not found');

  const old = list[idx];
  const updated: MeetingRoom = {
    ...old,
    ...updates,
    updated_at: now,
  };

  if (isSupabaseConfigured) {
    await supabase.from('meeting_rooms').update(updated).eq('id', id);
  }

  list[idx] = updated;
  setLocalItem(STORAGE_KEYS.MEETING_ROOMS, [...list]);
  recordLocalAudit(user, 'UPDATE', 'meeting_rooms', id, old, updated);
  return updated;
}

// -------------------------------------------------------------
// MEETING ATTENDANCE TRACKING SERVICE
// -------------------------------------------------------------
export async function getMeetingAttendanceRecords(
  inviteeId?: string,
  roomName?: string,
  date?: string
): Promise<MeetingAttendanceRecord[]> {
  const invitees = await getInvitees();
  const inviteeMap = new Map(invitees.map((i) => [i.id, i]));

  if (isSupabaseConfigured) {
    let query = supabase.from('meeting_attendance').select('*').order('in_time', { ascending: false });
    if (inviteeId) query = query.eq('invitee_id', inviteeId);
    if (roomName) query = query.eq('room_name', roomName);
    if (date) query = query.eq('meeting_date', date);
    const { data, error } = await query;
    if (!error && data) {
      return (data as MeetingAttendanceRecord[]).map((r) => ({
        ...r,
        invitee: inviteeMap.get(r.invitee_id),
      }));
    }
  }

  let list = getLocalItem<MeetingAttendanceRecord[]>(STORAGE_KEYS.MEETING_ATTENDANCE, INITIAL_MEETING_ATTENDANCE);
  if (inviteeId) list = list.filter((r) => r.invitee_id === inviteeId);
  if (roomName) list = list.filter((r) => r.room_name === roomName);
  if (date) list = list.filter((r) => r.meeting_date === date);
  return list.map((r) => ({
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
  const now = new Date().toISOString();
  const meetingDate = date || now.slice(0, 10);

  const newRec: MeetingAttendanceRecord = {
    id: 'mtg-att-' + Date.now(),
    invitee_id: inviteeId,
    room_name: roomName,
    session_name: sessionName,
    meeting_date: meetingDate,
    in_time: now,
    status: 'IN',
    recorded_by: user.id,
    recorded_by_name: user.full_name,
    created_at: now,
    updated_at: now,
  };

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('meeting_attendance').insert([newRec]).select().single();
    if (!error && data) return data as MeetingAttendanceRecord;
  }

  const list = getLocalItem<MeetingAttendanceRecord[]>(STORAGE_KEYS.MEETING_ATTENDANCE, INITIAL_MEETING_ATTENDANCE);
  setLocalItem(STORAGE_KEYS.MEETING_ATTENDANCE, [newRec, ...list]);
  recordLocalAudit(user, 'MEETING_ENTRY', 'meeting_attendance', newRec.id, null, newRec);
  return newRec;
}

export async function recordMeetingExit(
  recordIdOrInviteeId: string,
  user: UserProfile,
  notes?: string
): Promise<MeetingAttendanceRecord> {
  const now = new Date().toISOString();
  const list = getLocalItem<MeetingAttendanceRecord[]>(STORAGE_KEYS.MEETING_ATTENDANCE, INITIAL_MEETING_ATTENDANCE);

  let rec = list.find((r) => r.id === recordIdOrInviteeId);
  if (!rec) {
    rec = list.find((r) => r.invitee_id === recordIdOrInviteeId && r.status === 'IN' && !r.out_time);
  }
  if (!rec) {
    rec = list.find((r) => r.invitee_id === recordIdOrInviteeId);
  }
  if (!rec) throw new Error('No active meeting room session found');

  const inTime = new Date(rec.in_time || rec.entry_time || rec.created_at).getTime();
  const outTime = new Date(now).getTime();
  const duration = Math.max(0, Math.round((outTime - inTime) / (1000 * 60)));

  const updated: MeetingAttendanceRecord = {
    ...rec,
    out_time: now,
    exit_time: now,
    status: 'OUT',
    notes: notes ?? rec.notes,
    duration_minutes: duration,
    updated_at: now,
  };

  if (isSupabaseConfigured) {
    await supabase.from('meeting_attendance').update(updated).eq('id', rec.id);
  }

  const idx = list.findIndex((r) => r.id === rec!.id);
  if (idx !== -1) {
    list[idx] = updated;
    setLocalItem(STORAGE_KEYS.MEETING_ATTENDANCE, [...list]);
  }
  recordLocalAudit(user, 'MEETING_EXIT', 'meeting_attendance', rec.id, rec, updated);
  return updated;
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
      title: `Event Gate Entry (IN)`,
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
        title: `Event Gate Exit (OUT)`,
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


