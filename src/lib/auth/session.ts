import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export const SESSION_COOKIE_NAME = 'session';

function getSecret(): Uint8Array {
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  return new TextEncoder().encode(process.env.ENCRYPTION_KEY);
}

export interface SessionPayload {
  memberId: string;
  email: string;
  name: string;
  teamId: string | null;
  status: 'pending' | 'active' | 'suspended';
  isSystemAdmin: boolean;
  expiresAt: Date;
}

export interface SessionToken {
  token: string;
  expiresAt: Date;
}

export async function createSessionToken(payload: Omit<SessionPayload, 'expiresAt'>): Promise<SessionToken> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getSecret());

  return { token, expiresAt };
}

export async function createSession(payload: Omit<SessionPayload, 'expiresAt'>) {
  const { token, expiresAt } = await createSessionToken(payload);

  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === 'production' ||
    process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://');

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });

  return token;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      memberId: payload.memberId as string,
      email: payload.email as string,
      name: payload.name as string,
      teamId: (payload.teamId as string) || null,
      status: (payload.status as 'pending' | 'active' | 'suspended') || 'active',
      isSystemAdmin: (payload.isSystemAdmin as boolean) || false,
      expiresAt: new Date(payload.exp! * 1000),
    };
  } catch {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
