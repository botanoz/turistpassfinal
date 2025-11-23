/**
 * Seed Customer Profiles
 *
 * Migrates mock customer data to the database
 * This will be implemented in FAZ 3
 */

export async function seedCustomers() {
  console.log('👥 Seeding customers...')

  // TODO: Implement when customer_profiles table is created
  // Will migrate data from lib/mockData/adminCustomersData.ts

  console.log('   ⏭️  Skipped (will implement in FAZ 3)')
}

if (require.main === module) {
  seedCustomers()
}
