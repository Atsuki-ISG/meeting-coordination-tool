// Availability settings types
export interface DayAvailability {
  enabled: boolean;
  allDay?: boolean;  // If true, no time restriction (full day, minus Google Calendar conflicts)
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

// Member status types
export type MemberStatus = 'pending' | 'active' | 'suspended';

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
  status: MemberStatus;
  is_system_admin: boolean;
  is_note_taker: boolean;
  team_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  invite_code: string;
  status: 'pending' | 'active';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MemberRequest {
  id: string;
  email: string;
  name: string;
  google_id: string;
  google_refresh_token: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimeSlotPreset {
  id: string;
  team_id: string;
  name: string;
  days: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface TimeRestrictionCustom {
  days: number[];
  start_time: string;
  end_time: string;
}

export interface EventType {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  duration_minutes: 15 | 30 | 45 | 60;
  organizer_id: string;
  is_active: boolean;
  participation_mode: 'all_required' | 'any_available';
  include_note_takers: boolean;
  calendar_title_template: string;
  time_restriction_type: 'none' | 'preset' | 'custom';
  time_restriction_preset_id: string | null;
  time_restriction_custom: TimeRestrictionCustom | null;
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
  company_name: string | null;
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
  companyName?: string;
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
