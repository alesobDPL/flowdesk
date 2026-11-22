import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === '/') {
    const locale = request.headers
      .get('accept-language')
      ?.toLowerCase()
      .startsWith('es')
      ? 'es'
      : 'en';
    const response = NextResponse.redirect(
      new URL(`/${locale}${request.nextUrl.search}`, request.url),
    );
    response.headers.set('Vary', 'Accept-Language');
    return response;
  }
  return intlMiddleware(request);
}

export const config = { matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'] };
