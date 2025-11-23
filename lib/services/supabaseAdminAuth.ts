/**
 * Supabase Admin Authentication Service
 *
 * Handles admin authentication using Supabase Auth + admin_profiles table
 * Replaces the old localStorage-based adminAuthService
 */

import { createClient } from '@/lib/supabase/client'
import type { Admin } from '@/lib/types/admin'

class SupabaseAdminAuthService {
  /**
   * Sign in admin user
   */
  async signIn(email: string, password: string): Promise<{
    success: boolean
    admin?: Admin
    error?: string
  }> {
    try {
      const supabase = createClient()

      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        return {
          success: false,
          error: authError.message || 'Invalid credentials',
        }
      }

      if (!authData.user) {
        return {
          success: false,
          error: 'Authentication failed',
        }
      }

      // Fetch admin profile from admin_profiles table
      const { data: adminProfile, error: profileError } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      if (profileError || !adminProfile) {
        // User exists but is not an admin
        await supabase.auth.signOut()
        return {
          success: false,
          error: 'Access denied. This account does not have admin privileges.',
        }
      }

      // Update last_login timestamp
      await supabase
        .from('admin_profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', authData.user.id)

      // Map database profile to Admin type
      const admin: Admin = {
        id: adminProfile.id,
        email: adminProfile.email,
        name: adminProfile.name || '',
        role: adminProfile.role as Admin['role'],
        permissions: adminProfile.permissions,
        createdAt: adminProfile.created_at,
        lastLogin: adminProfile.last_login,
      }

      return {
        success: true,
        admin,
      }
    } catch (error) {
      console.error('Sign in error:', error)
      return {
        success: false,
        error: 'An unexpected error occurred',
      }
    }
  }

  /**
   * Sign out admin user
   */
  async signOut(): Promise<void> {
    const supabase = createClient()
    await supabase.auth.signOut()
  }

  /**
   * Get current session
   */
  async getSession() {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session
  }

  /**
   * Get current admin user with profile
   */
  async getCurrentAdmin(): Promise<Admin | null> {
    try {
      const supabase = createClient()

      // Get current session
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        return null
      }

      // Fetch admin profile
      const { data: adminProfile, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (error || !adminProfile) {
        return null
      }

      return {
        id: adminProfile.id,
        email: adminProfile.email,
        name: adminProfile.name || '',
        role: adminProfile.role as Admin['role'],
        permissions: adminProfile.permissions,
        createdAt: adminProfile.created_at,
        lastLogin: adminProfile.last_login,
      }
    } catch (error) {
      console.error('Get current admin error:', error)
      return null
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession()
    return !!session
  }

  /**
   * Check if admin has specific permission
   */
  async hasPermission(permission: keyof Admin['permissions']): Promise<boolean> {
    const admin = await this.getCurrentAdmin()

    if (!admin) {
      return false
    }

    // Super admins have all permissions
    if (admin.role === 'super_admin') {
      return true
    }

    return admin.permissions[permission] === true
  }

  /**
   * Get admin role
   */
  async getRole(): Promise<Admin['role'] | null> {
    const admin = await this.getCurrentAdmin()
    return admin?.role || null
  }
}

// Export singleton instance
export const supabaseAdminAuth = new SupabaseAdminAuthService()
