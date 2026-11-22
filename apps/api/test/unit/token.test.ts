import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { generateToken, hashToken } from '../../src/demo/session/token.js';

it('token has 43 base64url chars and hash is sha256 of it', () => {
  const { token, hash } = generateToken();
  expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(Buffer.from(token, 'base64url')).toHaveLength(32);
  expect(hash).toEqual(createHash('sha256').update(token).digest());
  expect(hashToken(token)).toEqual(hash);
  expect(hash).toHaveLength(32);
});

it('two tokens differ', () => {
  const first = generateToken();
  const second = generateToken();
  expect(first.token).not.toBe(second.token);
  expect(first.hash).not.toEqual(second.hash);
});
