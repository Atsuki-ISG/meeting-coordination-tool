import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SESSION_COOKIE_NAME = 'session';
const SECRET = new TextEncoder().encode(
  process.env.ENCRYPTION_KEY || 'fallback-secret-key-for-development'
);

export interface SessionUser {
  memberId: string;
  email: string;
  name: string;
  teamId: string | null;
  status: 'pending' | 'active' | 'suspended';
  isSystemAdmin: boolean;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      memberId: payload.memberId as string,
      email: payload.email as string,
      name: payload.name as string,
      teamId: (payload.teamId as string) || null,
      status: (payload.status as 'pending' | 'active' | 'suspended') || 'active',
      isSystemAdmin: (payload.isSystemAdmin as boolean) || false,
    };
  } catch {
    return null;
  }
}
