#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables: VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY');
  console.log('Please add SUPABASE_SERVICE_KEY to your .env file');
  process.exit(1);
}

console.log('🚀 Starting Retrieval Module migration...');
console.log('📍 Supabase URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
});

async function runMigration() {
  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '003_add_retrieval_module.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded: 003_add_retrieval_module.sql');
    
    // Split SQL into individual statements (simple split by semicolon)
    const statements = migrationSQL
      .split(/;\s*$/m)
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';');
    
    console.log(`📊 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      
      // Skip comments
      if (stmt.startsWith('--')) continue;
      
      // Get first few words of statement for logging
      const stmtPreview = stmt.substring(0, 60).replace(/\n/g, ' ');
      console.log(`\n[${i + 1}/${statements.length}] Executing: ${stmtPreview}...`);
      
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: stmt
      });
      
      if (error) {
        // Check if error is because object already exists (not a real error)
        if (error.message.includes('already exists')) {
          console.log(`✓ Object already exists, skipping...`);
        } else {
          console.error(`❌ Error executing statement:`, error.message);
          console.error('Statement:', stmtPreview);
          throw error;
        }
      } else {
        console.log(`✅ Statement executed successfully`);
      }
    }
    
    // Verify tables were created
    console.log('\n🔍 Verifying tables...');
    
    const tables = ['memory_settings', 'summary_prompts', 'summaries', 'summary_events'];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error && !error.message.includes('no rows')) {
        console.error(`❌ Table ${table} verification failed:`, error.message);
      } else {
        console.log(`✅ Table ${table} exists and is accessible`);
      }
    }
    
    // Check if default prompt was created
    const { data: prompts } = await supabase
      .from('summary_prompts')
      .select('*')
      .eq('is_active', true)
      .limit(1);
    
    if (prompts && prompts.length > 0) {
      console.log('✅ Default summarization prompt created');
    }
    
    console.log('\n✨ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Update TypeScript types in src/lib/supabase.ts');
    console.log('2. Create API route for summarization');
    console.log('3. Update DATABASE_CHANGELOG.md');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
runMigration().catch(console.error);