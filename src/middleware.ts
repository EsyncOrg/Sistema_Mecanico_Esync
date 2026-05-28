import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_COOKIE = 'forge_erp_session'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSession   = request.cookies.has(SESSION_COOKIE)

  // Only use the middleware to skip the login screen when already authenticated.
  // Dashboard protection is handled client-side by the AuthProvider + layout guard,
  // which is the only place that can reliably read sessionStorage.
  if (hasSession && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
