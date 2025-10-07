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
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

console.log('🚀 Starting Personality Summarization migration...');
console.log('📍 Supabase URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runMigration() {
  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '004_add_personality_summarization.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded: 004_add_personality_summarization.sql');
    
    // Split SQL into individual statements (simple split by semicolon)
    const statements = migrationSQL
      .split(/;(?=\s*(?:--|\n|$))/m)
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim())
      .filter(stmt => !stmt.startsWith('--') && !stmt.startsWith('/*'));
    
    console.log(`📊 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      let stmt = statements[i];
      
      // Skip empty statements
      if (!stmt.trim()) continue;
      
      // Add semicolon if missing
      if (!stmt.endsWith(';')) {
        stmt += ';';
      }
      
      // Get first few words of statement for logging
      const stmtPreview = stmt.substring(0, 80).replace(/\n/g, ' ').replace(/\s+/g, ' ');
      console.log(`\n[${i + 1}/${statements.length}] Executing: ${stmtPreview}...`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: stmt
        });
        
        if (error) {
          // Check if error is because object already exists (not a real error)
          if (error.message.includes('already exists') || 
              error.message.includes('does not exist') ||
              error.message.includes('duplicate column')) {
            console.log(`✓ Already exists or expected condition, skipping...`);
          } else {
            console.error(`❌ Error executing statement:`, error.message);
            console.error('Statement:', stmtPreview);
            throw error;
          }
        } else {
          console.log(`✅ Statement executed successfully`);
        }
      } catch (statementError) {
        console.error(`❌ Failed to execute statement ${i + 1}:`, statementError.message);
        throw statementError;
      }
    }
    
    // Verify changes were applied
    console.log('\n🔍 Verifying migration...');
    
    // Check if new columns exist
    const { data: columns, error: columnsError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type, column_default, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'personalities' 
        AND column_name IN ('summarization_enabled', 'summarization_model', 'summarization_prompt')
        ORDER BY column_name;
      `
    });
    
    if (columnsError) {
      console.error('❌ Verification failed:', columnsError.message);
    } else if (columns && columns.length === 3) {
      console.log('✅ All 3 new columns added successfully:');
      console.log('   - summarization_enabled (boolean)');
      console.log('   - summarization_model (text)'); 
      console.log('   - summarization_prompt (text)');
    } else {
      console.log('⚠️ Some columns may not have been added properly');
    }
    
    // Check index creation
    const { data: indexes } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT indexname FROM pg_indexes 
        WHERE tablename = 'personalities' 
        AND indexname = 'idx_personalities_summarization_enabled';
      `
    });
    
    if (indexes && indexes.length > 0) {
      console.log('✅ Index idx_personalities_summarization_enabled created');
    }
    
    console.log('\n✨ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Update TypeScript types in src/lib/supabase.ts');
    console.log('2. Update MemorySettings component to work with personalities');
    console.log('3. Update sendMessage logic to check personality.summarization_enabled');
    console.log('4. Remove memory_settings table (no longer needed)');
    console.log('5. Update DATABASE_CHANGELOG.md');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the migration
runMigration().catch(console.error);