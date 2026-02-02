// Availability settings types
export interface DayAvailability {
  enabled: boolean;
  startTime: string; // "09:00"
  endTime: string;   // "18:00"
}

export interface WeeklyAvailability {
  [key: string]: DayAvailability; // "0" (Sunday) to "6" (Saturday)
}

export const DEFAULT_AVAILABILITY: WeeklyAvailability = {
  "0": { enabled: false, startTime: "09:00", endTime: "18:00" }, // Sunday
  "1": { enabled: true, startTime: "09:00", endTime: "18:00" },  // Monday
  "2": { enabled: true, startTime: "09:00", endTime: "18:00" },  // Tuesday
  "3": { enabled: true, startTime: "09:00", endTime: "18:00" },  // Wednesday
  "4": { enabled: true, startTime: "09:00", endTime: "18:00" },  // Thursday
  "5": { enabled: true, startTime: "09:00", endTime: "18:00" },  // Friday
  "6": { enabled: false, startTime: "09:00", endTime: "18:00" }, // Saturday
};

// Database types
export interface Member {
  id: string;
  email: string;
  name: string;
  google_refresh_token: string | null;
  google_token_expires_at: string | null;
  is_active: boolean;
  availability_settings: WeeklyAvailability | null;
  role: 'admin' | 'member';
  team_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EventType {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  duration_minutes: 15 | 30 | 45 | 60;
  organizer_id: string;
  is_active: boolean;
  created_at: string;
}

export interface EventTypeMember {
  event_type_id: string;
  member_id: string;
}

export interface Booking {
  id: string;
  event_type_id: string;
  google_event_id: string | null;
  start_at: string;
  end_at: string;
  requester_name: string;
  requester_email: string;
  note: string | null;
  cancel_token_hash: string | null;
  status: 'confirmed' | 'canceled';
  created_at: string;
  canceled_at: string | null;
}

export interface ApiUsageLog {
  id: string;
  endpoint: string;
  member_id: string | null;
  request_count: number;
  created_at: string;
}

export interface SystemSetting {
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
}

// Application types
export interface TimeSlot {
  start: Date;
  end: Date;
}

export interface BusySlot {
  start: Date;
  end: Date;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface BookingFormData {
  name: string;
  email: string;
  note?: string;
  slot: TimeSlot;
}

export interface EventTypeWithMembers extends EventType {
  members: Member[];
  organizer: Member;
}

export interface BookingWithEventType extends Booking {
  event_type: EventType;
}

// API Response types
export interface AvailabilityResponse {
  slots: TimeSlot[];
  timezone: string;
}

export interface BookingResponse {
  success: boolean;
  booking?: Booking;
  error?: string;
}

export interface CancelResponse {
  success: boolean;
  error?: string;
}
