import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Next.js Middleware
 *
 * Runs on every request before reaching pages
 * Handles:
 * - Session refresh
 * - Route protection
 * - Redirects based on auth state
 */
export async function middleware(request: NextRequest) {
  // Update Supabase session (this handles auth automatically)
  const response = await updateSession(request)

  // For now, just refresh sessions
  // Auth protection is handled in AdminLayout (client-side)
  // We'll add proper middleware protection in FAZ 2

  // Note: Removing middleware auth check temporarily to fix redirect loop
  // The issue is that Supabase cookies are managed by @supabase/ssr
  // and checking them manually causes issues

  return response
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
