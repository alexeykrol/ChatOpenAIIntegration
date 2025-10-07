#!/usr/bin/env node

/**
 * Apply security fixes migration
 * This script applies critical security fixes including:
 * - Securing/removing exec_sql function
 * - Adding RLS policies to all tables
 *
 * Usage: node supabase/scripts/apply-security-fixes.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - VITE_SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_KEY)');
  console.error('\nPlease set these in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applySecurityFixes() {
  console.log('🔒 Applying security fixes...\n');

  try {
    // Read migration file
    const migrationPath = join(__dirname, '../migrations/005_secure_exec_sql.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Executing migration: 005_secure_exec_sql.sql');
    console.log('   Purpose: Secure/remove dangerous exec_sql function\n');

    // Execute migration using the old exec_sql function (ironic, but this is the last time)
    const { data, error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      // Try using exec_sql_admin if exec_sql was already removed
      const { data: data2, error: error2 } = await supabase.rpc('exec_sql_admin', { sql });

      if (error2) {
        console.error('❌ Migration failed:', error2.message);
        console.error('\nTry running this SQL manually in Supabase SQL editor:');
        console.error(migrationPath);
        process.exit(1);
      }

      if (data2?.success === false) {
        console.error('❌ Migration failed:', data2.error);
        process.exit(1);
      }

      console.log('✅ Security fixes applied successfully!');
      return;
    }

    console.log('✅ Security fixes applied successfully!');
    console.log('\n🔐 Changes applied:');
    console.log('   • exec_sql function removed/secured');
    console.log('   • Only service_role can execute admin SQL');
    console.log('   • DDL operations whitelisted');
    console.log('   • Dangerous operations blacklisted');

    console.log('\n⚠️  Migration scripts will need to be updated to use:');
    console.log('   • exec_sql_admin instead of exec_sql');
    console.log('   • Or preferably: use Supabase migration files directly');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run migration
applySecurityFixes()
  .then(() => {
    console.log('\n✅ Security migration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
