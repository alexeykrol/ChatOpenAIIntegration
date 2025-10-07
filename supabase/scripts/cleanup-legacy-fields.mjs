import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
const __dirname = new URL('.', import.meta.url).pathname;
config({ path: resolve(__dirname, '../../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function cleanupLegacyFields() {
  try {
    console.log('🧹 Starting legacy fields cleanup...');
    
    // Step 1: Drop RAG-related fields
    console.log('📋 Step 1: Removing RAG legacy fields...');
    const { error: step1Error } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE personalities 
            DROP COLUMN IF EXISTS chunk_size,
            DROP COLUMN IF EXISTS top_chunks,
            DROP COLUMN IF EXISTS embedding_model;`
    });
    if (step1Error) throw step1Error;
    console.log('✅ RAG fields removed');
    
    // Step 2: Drop old single file field (will be replaced by files JSONB)
    console.log('📋 Step 2: Removing old file_name field...');
    const { error: step2Error } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE personalities DROP COLUMN IF EXISTS file_name;`
    });
    if (step2Error) throw step2Error;
    console.log('✅ file_name field removed');
    
    console.log('🎉 Legacy fields cleanup completed successfully!');
    
    // Verify cleanup
    console.log('🔍 Verifying cleanup...');
    const { data: columns, error: verifyError } = await supabase.rpc('exec_sql', {
      sql: `SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'personalities' 
            ORDER BY ordinal_position;`
    });
    
    if (!verifyError && columns) {
      console.log('📊 Remaining columns:');
      columns.forEach(col => {
        console.log(`  ✓ ${col.column_name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupLegacyFields();