import { isIP } from 'node:net';

export function truncateIp(ip: string): string {
  const version = isIP(ip);
  if (version === 4) return `${ip.split('.').slice(0, 3).join('.')}.0/24`;
  if (version !== 6) return 'unknown';
  // Normalize embedded IPv4 before expanding the compressed IPv6 groups.
  const address = ip
    .split('%')[0]!
    .replace(
      /(\d+)\.(\d+)\.(\d+)\.(\d+)$/,
      (_, a: string, b: string, c: string, d: string) =>
        `${((Number(a) << 8) | Number(b)).toString(16)}:${((Number(c) << 8) | Number(d)).toString(16)}`,
    );
  const [left = '', right] = address.split('::');
  const first = left ? left.split(':') : [];
  const last = right ? right.split(':') : [];
  const groups =
    right === undefined
      ? first
      : [
          ...first,
          ...Array<string>(8 - first.length - last.length).fill('0'),
          ...last,
        ];
  return `${groups
    .slice(0, 3)
    .map((group) => Number.parseInt(group, 16).toString(16))
    .join(':')}::/48`;
}

export function serializeRequest(request: {
  method: string;
  url: string;
  ip: string;
  headers?: unknown;
}) {
  return {
    method: request.method,
    url: request.url,
    ip: truncateIp(request.ip),
  };
}
