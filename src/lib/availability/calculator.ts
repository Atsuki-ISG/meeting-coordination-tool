import { addMinutes, startOfDay, endOfDay, isAfter, isBefore, max, min, getDay } from 'date-fns';
import type { TimeSlot, BusySlot, DateRange, WeeklyAvailability } from '@/types';
import { DEFAULT_AVAILABILITY } from '@/types';

interface AvailabilityConfig {
  slotDurationMinutes: number;
  minBookingNoticeMinutes: number; // Minimum time before a slot can be booked
  weeklyAvailability: WeeklyAvailability;
}

const DEFAULT_CONFIG: AvailabilityConfig = {
  slotDurationMinutes: 30,
  minBookingNoticeMinutes: 60, // At least 1 hour notice required
  weeklyAvailability: DEFAULT_AVAILABILITY,
};

/**
 * Merge overlapping busy slots from multiple sources
 */
export function mergeBusySlots(busySlotsArrays: BusySlot[][]): BusySlot[] {
  // Flatten all busy slots
  const allSlots = busySlotsArrays.flat();

  if (allSlots.length === 0) return [];

  // Sort by start time
  const sorted = [...allSlots].sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  );

  const merged: BusySlot[] = [];
  let current = { ...sorted[0] };

  for (let i = 1; i < sorted.length; i++) {
    const slot = sorted[i];

    // Check if slots overlap or are adjacent
    if (slot.start.getTime() <= current.end.getTime()) {
      // Extend current slot if needed
      current.end = new Date(
        Math.max(current.end.getTime(), slot.end.getTime())
      );
    } else {
      // No overlap, push current and start new
      merged.push(current);
      current = { ...slot };
    }
  }

  merged.push(current);
  return merged;
}

/**
 * Generate working hours for a given date based on weekly availability
 */
function getWorkingHours(
  date: Date,
  config: AvailabilityConfig
): { start: Date; end: Date; enabled: boolean } {
  const dayOfWeek = getDay(date); // 0 = Sunday, 6 = Saturday
  const daySettings = config.weeklyAvailability[String(dayOfWeek)];

  if (!daySettings || !daySettings.enabled) {
    return { start: date, end: date, enabled: false };
  }

  const [startHour, startMin] = daySettings.startTime.split(':').map(Number);
  const [endHour, endMin] = daySettings.endTime.split(':').map(Number);

  const start = new Date(date);
  start.setHours(startHour, startMin, 0, 0);

  const end = new Date(date);
  end.setHours(endHour, endMin, 0, 0);

  return { start, end, enabled: true };
}

/**
 * Get free slots from busy slots within a time range
 */
function getFreeSlots(
  busySlots: BusySlot[],
  rangeStart: Date,
  rangeEnd: Date
): TimeSlot[] {
  const freeSlots: TimeSlot[] = [];

  let currentStart = rangeStart;

  for (const busy of busySlots) {
    // If busy slot starts after current position, there's free time
    if (busy.start > currentStart) {
      const freeEnd = min([busy.start, rangeEnd]);
      if (freeEnd > currentStart) {
        freeSlots.push({ start: currentStart, end: freeEnd });
      }
    }

    // Move current position to end of busy slot
    currentStart = max([currentStart, busy.end]);

    // If we've passed the range end, stop
    if (currentStart >= rangeEnd) break;
  }

  // Add remaining free time after last busy slot
  if (currentStart < rangeEnd) {
    freeSlots.push({ start: currentStart, end: rangeEnd });
  }

  return freeSlots;
}

/**
 * Split a free slot into bookable time slots
 */
function splitIntoSlots(
  freeSlot: TimeSlot,
  durationMinutes: number
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  let current = freeSlot.start;

  while (true) {
    const slotEnd = addMinutes(current, durationMinutes);
    if (slotEnd > freeSlot.end) break;

    slots.push({ start: new Date(current), end: slotEnd });
    current = slotEnd;
  }

  return slots;
}

/**
 * Calculate available time slots for booking
 */
export function calculateAvailability(
  busySlotsArrays: BusySlot[][],
  dateRange: DateRange,
  durationMinutes: number,
  config: Partial<AvailabilityConfig> = {}
): TimeSlot[] {
  const finalConfig = { ...DEFAULT_CONFIG, ...config, slotDurationMinutes: durationMinutes };
  const mergedBusy = mergeBusySlots(busySlotsArrays);
  const now = new Date();
  const minBookingTime = addMinutes(now, finalConfig.minBookingNoticeMinutes);

  const availableSlots: TimeSlot[] = [];

  // Iterate through each day in the range
  let currentDate = startOfDay(dateRange.start);
  const endDate = endOfDay(dateRange.end);

  while (currentDate <= endDate) {
    const { start: workStart, end: workEnd, enabled } = getWorkingHours(
      currentDate,
      finalConfig
    );

    // Skip disabled days (weekends or custom disabled days)
    if (!enabled) {
      currentDate = addMinutes(startOfDay(currentDate), 24 * 60);
      continue;
    }

    // Adjust for minimum booking notice
    const effectiveStart = max([workStart, minBookingTime]);

    // Skip if the entire working day is in the past
    if (effectiveStart >= workEnd) {
      currentDate = addMinutes(startOfDay(currentDate), 24 * 60);
      continue;
    }

    // Filter busy slots that overlap with this day's working hours
    const dayBusy = mergedBusy.filter(
      (slot) => slot.start < workEnd && slot.end > effectiveStart
    );

    // Get free slots for this day
    const freeSlots = getFreeSlots(dayBusy, effectiveStart, workEnd);

    // Split free slots into bookable time slots
    for (const freeSlot of freeSlots) {
      const slots = splitIntoSlots(freeSlot, finalConfig.slotDurationMinutes);
      availableSlots.push(...slots);
    }

    // Move to next day
    currentDate = addMinutes(startOfDay(currentDate), 24 * 60);
  }

  return availableSlots;
}

/**
 * Check if a specific time slot is still available
 */
export function isSlotAvailable(
  slot: TimeSlot,
  busySlotsArrays: BusySlot[][]
): boolean {
  const mergedBusy = mergeBusySlots(busySlotsArrays);

  for (const busy of mergedBusy) {
    // Check for any overlap
    if (slot.start < busy.end && slot.end > busy.start) {
      return false;
    }
  }

  return true;
}
