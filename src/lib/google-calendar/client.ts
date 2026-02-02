import { google, calendar_v3 } from 'googleapis';
import { encrypt, decrypt } from '@/lib/utils/encryption';
import type { BusySlot } from '@/types';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`
);

/**
 * Generate OAuth URL for user authorization
 */
export function getAuthUrl(state?: string): string {
  const scopes = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state,
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function getTokensFromCode(code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Create an authenticated Calendar client
 */
export function createCalendarClient(
  accessToken: string,
  refreshToken?: string
): calendar_v3.Calendar {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  auth.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return google.calendar({ version: 'v3', auth });
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  encryptedRefreshToken: string
): Promise<{ accessToken: string; expiresAt: Date }> {
  const refreshToken = decrypt(encryptedRefreshToken);

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  const { credentials } = await oauth2Client.refreshAccessToken();

  if (!credentials.access_token) {
    throw new Error('Failed to refresh access token');
  }

  return {
    accessToken: credentials.access_token,
    expiresAt: new Date(credentials.expiry_date || Date.now() + 3600000),
  };
}

/**
 * Get busy times from a calendar (including pending invitations)
 * Uses Events API to include events that haven't been accepted yet
 */
export async function getFreeBusy(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  timeMin: Date,
  timeMax: Date
): Promise<BusySlot[]> {
  // Use Events API to get all events including pending invitations
  const response = await calendar.events.list({
    calendarId,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = response.data.items || [];
  const busySlots: BusySlot[] = [];

  for (const event of events) {
    // Skip declined events and cancelled events
    if (event.status === 'cancelled') continue;

    // Check if the user has declined this event
    const selfAttendee = event.attendees?.find(a => a.self);
    if (selfAttendee?.responseStatus === 'declined') continue;

    // Skip all-day events (they don't have dateTime)
    if (!event.start?.dateTime || !event.end?.dateTime) continue;

    busySlots.push({
      start: new Date(event.start.dateTime),
      end: new Date(event.end.dateTime),
    });
  }

  return busySlots;
}

/**
 * Get busy times for multiple members
 */
export async function getMultipleMembersBusy(
  members: Array<{
    calendarId: string;
    accessToken: string;
    refreshToken?: string;
  }>,
  timeMin: Date,
  timeMax: Date
): Promise<BusySlot[][]> {
  const results = await Promise.all(
    members.map(async (member) => {
      try {
        const calendar = createCalendarClient(
          member.accessToken,
          member.refreshToken
        );
        return await getFreeBusy(calendar, member.calendarId, timeMin, timeMax);
      } catch (error) {
        console.error(`Failed to get busy times for ${member.calendarId}:`, error);
        return [];
      }
    })
  );

  return results;
}

/**
 * Create a calendar event
 */
export async function createCalendarEvent(
  calendar: calendar_v3.Calendar,
  event: {
    summary: string;
    description?: string;
    start: Date;
    end: Date;
    attendees: string[];
    organizerEmail: string;
    addMeetLink?: boolean;
  }
): Promise<{ eventId: string; meetLink?: string }> {
  const requestBody: calendar_v3.Schema$Event = {
    summary: event.summary,
    description: event.description,
    start: {
      dateTime: event.start.toISOString(),
      timeZone: 'Asia/Tokyo',
    },
    end: {
      dateTime: event.end.toISOString(),
      timeZone: 'Asia/Tokyo',
    },
    attendees: event.attendees.map((email) => ({ email })),
    organizer: {
      email: event.organizerEmail,
    },
  };

  // Add Google Meet link if requested
  if (event.addMeetLink) {
    requestBody.conferenceData = {
      createRequest: {
        requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        conferenceSolutionKey: {
          type: 'hangoutsMeet',
        },
      },
    };
  }

  const response = await calendar.events.insert({
    calendarId: 'primary',
    sendUpdates: 'all',
    conferenceDataVersion: event.addMeetLink ? 1 : undefined,
    requestBody,
  });

  if (!response.data.id) {
    throw new Error('Failed to create calendar event');
  }

  return {
    eventId: response.data.id,
    meetLink: response.data.conferenceData?.entryPoints?.find(
      (ep) => ep.entryPointType === 'video'
    )?.uri ?? undefined,
  };
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(
  calendar: calendar_v3.Calendar,
  eventId: string
): Promise<void> {
  await calendar.events.delete({
    calendarId: 'primary',
    eventId,
    sendUpdates: 'all',
  });
}

/**
 * Get user info from access token
 */
export async function getUserInfo(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const oauth2 = google.oauth2({ version: 'v2', auth });
  const { data } = await oauth2.userinfo.get();

  return {
    email: data.email!,
    name: data.name || data.email!,
  };
}

/**
 * Encrypt refresh token for storage
 */
export function encryptRefreshToken(token: string): string {
  return encrypt(token);
}
