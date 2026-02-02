import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Generate a secure random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash a token for secure storage
 */
export async function hashToken(token: string): Promise<string> {
  return bcrypt.hash(token, SALT_ROUNDS);
}

/**
 * Verify a token against its hash
 */
export async function verifyToken(
  token: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(token, hash);
}

/**
 * Generate a cancel token with expiration
 */
export function generateCancelToken(): {
  token: string;
  expiresAt: Date;
} {
  const token = generateToken();
  // Token expires when the event starts (will be set based on booking)
  const expiresAt = new Date();
  return { token, expiresAt };
}
