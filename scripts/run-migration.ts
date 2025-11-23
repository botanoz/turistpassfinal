/**
 * Run SQL Migration Script
 *
 * Executes SQL migration files against Supabase database
 * Uses service role key to bypass RLS
 *
 * Usage:
 *   tsx scripts/run-migration.ts <migration-file>
 *   tsx scripts/run-migration.ts supabase/migrations/001_create_admin_profiles.sql
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

async function runMigration(migrationFile: string) {
  console.log(`\n==> Running migration: ${migrationFile}\n`)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('ERROR: Missing Supabase credentials in .env.local')
    console.error('   Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  try {
    const sqlPath = join(process.cwd(), migrationFile)
    const sql = readFileSync(sqlPath, 'utf-8')

    console.log('==> SQL Content Preview:')
    console.log('-'.repeat(60))
    console.log(sql.substring(0, 200) + '...\n')

    let data: any = null
    let error: any = null
    let manualExecutionRequired = false

    try {
      const rpcResult = await supabase.rpc('exec_sql', { sql_query: sql })
      data = rpcResult.data
      error = rpcResult.error
    } catch {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ sql_query: sql }),
      })

      if (!response.ok) {
        manualExecutionRequired = true
      } else {
        data = await response.json()
      }
    }

    if (error) {
      console.error('ERROR: Migration failed:', error)
      process.exit(1)
    }

    if (manualExecutionRequired) {
      console.log('WARNING: Direct SQL execution not available via exec_sql RPC')
      console.log('Please run this SQL manually in Supabase Dashboard > SQL Editor:\n')
      console.log('-'.repeat(60))
      console.log(sql)
      console.log('-'.repeat(60))
      console.log('\nPress Enter after running the SQL to continue...')
      await new Promise<void>((resolve) => {
        process.stdin.once('data', () => resolve())
      })
      console.log('Resuming after manual execution confirmation...')
    } else {
      console.log('SUCCESS: Migration completed successfully!')
    }
  } catch (error) {
    console.error('ERROR running migration:', error)
    console.log('\nPlease run this SQL manually in Supabase Dashboard > SQL Editor')
    console.log('URL: https://supabase.com/dashboard/project/dpnlyvgqdbagbrjxuvgw/sql/new')
    process.exit(1)
  }
}

const migrationFile = process.argv[2]

if (!migrationFile) {
  console.error('ERROR: Please provide migration file path')
  console.error('   Usage: tsx scripts/run-migration.ts <migration-file>')
  console.error('   Example: tsx scripts/run-migration.ts supabase/migrations/001_create_admin_profiles.sql')
  process.exit(1)
}

runMigration(migrationFile)
