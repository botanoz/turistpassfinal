import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * Server-side Supabase client
 * Used in Server Components, Server Actions, and Route Handlers
 *
 * This client:
 * - Reads/writes auth cookies securely
 * - Works in server-side context only
 * - Respects RLS policies
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Admin client with service role key
 * ONLY use this for admin operations that need to bypass RLS
 * NEVER expose this client to the browser
 *
 * Use cases:
 * - Creating users from admin panel
 * - Bulk operations
 * - System-level operations
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Debug: Log if service role key is missing
  if (!serviceRoleKey) {
    console.error('❌ CRITICAL: SUPABASE_SERVICE_ROLE_KEY is not set!');
    console.error('This will cause permission denied errors.');
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  }

  if (serviceRoleKey.length < 100) {
    console.warn('⚠️  WARNING: SUPABASE_SERVICE_ROLE_KEY looks too short:', serviceRoleKey.length, 'chars');
  }

  console.log('✅ Creating admin client with service role key (length:', serviceRoleKey.length, ')');

  // Use the standard Supabase client (not SSR) with service role key
  // This properly sets the Authorization header with service_role JWT
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
