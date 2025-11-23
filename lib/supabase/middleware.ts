import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware helper for Supabase authentication
 *
 * This handles:
 * - Session refresh on every request
 * - Cookie management
 * - Auth state synchronization
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // If there is no Supabase auth cookie, avoid calling the auth API to prevent slow/failed requests
  const hasAuthCookie = request.cookies.getAll().some(({ name }) =>
    name.startsWith('sb-') || name === 'supabase-auth-token' || name === 'supabaseRefreshToken'
  )

  if (hasAuthCookie) {
    // Refresh session if expired - required for Server Components
    await supabase.auth.getUser()
  }

  return response
}
