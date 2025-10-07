import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables:');
  console.error('- VITE_SUPABASE_URL');
  console.error('- VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyFilesMigration() {
  try {
    console.log('🚀 Starting files migration...');
    
    // Step 1: Add files column
    console.log('📋 Step 1: Adding files JSONB column...');
    const { error: step1Error } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE personalities ADD COLUMN IF NOT EXISTS files JSONB DEFAULT '[]';`
    });
    if (step1Error) throw step1Error;
    
    // Step 2: Create index
    console.log('📋 Step 2: Creating GIN index for files...');
    const { error: step2Error } = await supabase.rpc('exec_sql', {
      sql: `CREATE INDEX IF NOT EXISTS personalities_files_gin_idx ON personalities USING gin(files);`
    });
    if (step2Error) throw step2Error;
    
    // Step 3: Add constraint
    console.log('📋 Step 3: Adding files limit constraint...');
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE personalities DROP CONSTRAINT IF EXISTS personalities_files_limit;`
    });
    const { error: step3Error } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE personalities 
            ADD CONSTRAINT personalities_files_limit 
            CHECK (jsonb_array_length(files) <= 20);`
    });
    if (step3Error) throw step3Error;
    
    console.log('✅ Files migration completed successfully!');
    
    // Verify migration results
    console.log('🔍 Verifying migration...');
    const { data: personalities, error: verifyError } = await supabase
      .from('personalities')
      .select('id, name, files')
      .not('files', 'eq', '[]');
    
    if (verifyError) {
      console.error('⚠️  Verification failed:', verifyError);
    } else {
      console.log(`✅ Found ${personalities?.length || 0} personalities with files`);
      personalities?.forEach(p => {
        console.log(`  - ${p.name}: ${JSON.parse(p.files).length} files`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  }
}

// Run migration
applyFilesMigration();