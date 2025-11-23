/**
 * Seed Admin Users
 *
 * Creates initial admin accounts for testing
 * This will be implemented when we create the admin_profiles table
 */

export async function seedAdmin() {
  console.log('👤 Seeding admin users...')

  // TODO: Implement when admin_profiles table is created
  // Will create:
  // - Super Admin (admin@turistpass.com)
  // - Regular Admin
  // - Support User

  console.log('   ⏭️  Skipped (will implement in FAZ 1)')
}

// Allow running directly
if (require.main === module) {
  seedAdmin()
}
