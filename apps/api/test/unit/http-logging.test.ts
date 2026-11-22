import { expect, it } from 'vitest';
import { serializeRequest, truncateIp } from '../../src/http/logging.js';

it.each([
  ['192.0.2.123', '192.0.2.0/24'],
  ['127.0.0.1', '127.0.0.0/24'],
  ['2001:db8:abcd:1234:5678:90ab:cdef:1234', '2001:db8:abcd::/48'],
  ['2001:db8::1', '2001:db8:0::/48'],
  ['::1', '0:0:0::/48'],
  ['::ffff:192.0.2.123', '0:0:0::/48'],
  ['invalid', 'unknown'],
])('truncates %s to %s', (input, expected) => {
  expect(truncateIp(input)).toBe(expected);
});

it('serializes the request without cookies, forwarded IPs, or a full IP', () => {
  const entry = serializeRequest({
    method: 'GET',
    url: '/api/v1/session',
    ip: '192.0.2.123',
    headers: {
      cookie: 'fd_session=secret',
      'x-forwarded-for': '198.51.100.123',
    },
  });
  expect(entry).toMatchObject({ method: 'GET', ip: '192.0.2.0/24' });
  expect(JSON.stringify(entry)).not.toMatch(
    /secret|cookie|192\.0\.2\.123|198\.51\.100\.123/,
  );
});
