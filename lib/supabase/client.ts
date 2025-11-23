import { createBrowserClient } from '@supabase/ssr'

/**
 * Client-side Supabase client
 * Used in Client Components (with 'use client' directive)
 *
 * This client automatically handles:
 * - Session management via cookies
 * - Token refresh
 * - Browser-based auth flows
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
