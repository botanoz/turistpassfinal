/**
 * Master Seed Script
 *
 * Runs all seed scripts in order to populate the database with mock data
 * This is useful for development and testing
 *
 * Usage:
 *   npm run seed
 *
 * Or run individual seed scripts:
 *   npm run seed:admin
 *   npm run seed:customers
 *   etc.
 */

import { seedAdmin } from './seed-admin'
import { seedCustomers } from './seed-customers'
import { seedBusinesses } from './seed-businesses'
import { seedPasses } from './seed-passes'
import { seedOrders } from './seed-orders'
import { seedSupport } from './seed-support'

async function seedAll() {
  console.log('🌱 Starting database seeding...\n')

  try {
    // Order matters! Some tables depend on others
    await seedAdmin()
    await seedCustomers()
    await seedBusinesses()
    await seedPasses()
    await seedOrders()
    await seedSupport()

    console.log('\n✅ All seed scripts completed successfully!')
  } catch (error) {
    console.error('\n❌ Seeding failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  seedAll()
}

export { seedAll }
