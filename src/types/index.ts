export type UserRole =
  | 'Admin'
  | 'Transportation Team'
  | 'Accommodation Team'
  | 'Food Team'
  | 'Reception Team'
  | 'Meeting Hall Team';

export interface UserProfile {
  id: string;
  full_name: string;
  username: string;
  role: UserRole;
  department: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type InviteeCategory = 'Founder Members' | 'General Members' | 'Special Invitees';

export interface Invitee {
  id: string;
  invitee_code: string;
  full_name: string;
  category: InviteeCategory;
  phone: string;
  alternate_phone?: string | null;
  address?: string | null;
  city: string;
  state: string;
  country: string;
  remarks?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type JourneyType = 'arrival' | 'departure';
export type TransportMode = 'Flight' | 'Train' | 'Bus' | 'Car' | 'Other';

export interface TransportationRecord {
  id: string;
  invitee_id: string;
  invitee?: Invitee;
  journey_type: JourneyType;
  journey_date: string;
  journey_time?: string | null;
  transport_mode: TransportMode;
  location_type?: string | null;
  location_name: string;
  transport_number?: string | null;
  booking_reference?: string | null;
  pickup_required: boolean;
  pickup_point?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  remarks?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type AccommodationType = 'Hotel' | 'Hajj House' | 'Other' | 'No accommodation required';

export interface AccommodationRecord {
  id: string;
  invitee_id: string;
  invitee?: Invitee;
  accommodation_type: AccommodationType;
  hotel_name?: string | null;
  room_type?: string | null;
  room_number?: string | null;
  check_in_date?: string | null;
  check_in_time?: string | null;
  check_out_date?: string | null;
  check_out_time?: string | null;
  occupancy?: string | null;
  remarks?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FoodRecord {
  id: string;
  invitee_id: string;
  invitee?: Invitee;
  meal_date: string;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  refreshments: boolean;
  food_provider?: string | null;
  provider_contact?: string | null;
  provider_phone?: string | null;
  dietary_preference: string;
  special_requirements?: string | null;
  delivery_location?: string | null;
  remarks?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type ReceptionStatus = 'Expected' | 'Arrived' | 'Received' | 'Checked In' | 'Completed';

export interface ReceptionRecord {
  id: string;
  invitee_id: string;
  invitee?: Invitee;
  expected_arrival?: string | null;
  actual_arrival?: string | null;
  reception_status: ReceptionStatus;
  assigned_volunteer?: string | null;
  reception_point?: string | null;
  pickup_status?: string | null;
  welcome_kit_status?: string | null;
  registration_status?: string | null;
  remarks?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type AttendanceStatus = 'Expected' | 'Present' | 'Absent';
export type AssignmentStatus = 'Assigned' | 'Reserved' | 'VIP';

export interface MeetingHallRecord {
  id: string;
  invitee_id: string;
  invitee?: Invitee;
  meeting_hall: string;
  seating_section: string;
  seat_number: string;
  attendance_status: AttendanceStatus;
  assignment_status: AssignmentStatus;
  remarks?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  user_name?: string | null;
  action: string;
  table_name: string;
  record_id: string;
  previous_data?: any;
  new_data?: any;
  created_at: string;
}

export interface SystemSettings {
  id: string;
  setting_key: string;
  setting_value: any;
  updated_by?: string | null;
  updated_at: string;
}

