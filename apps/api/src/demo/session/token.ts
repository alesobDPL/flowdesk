import { createHash, randomBytes } from 'node:crypto';

export function hashToken(token: string): Buffer {
  return createHash('sha256').update(token).digest();
}

export function generateToken(): { token: string; hash: Buffer } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashToken(token) };
}
