import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get environment variables (assuming they're set)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service role key needed for DDL

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyMigration() {
  try {
    console.log('Applying RAG migration...');
    
    // Read the migration file
    const migrationSQL = readFileSync(
      join(__dirname, 'supabase/migrations/20250830143000_add_rag_support.sql'),
      'utf-8'
    );
    
    // Execute the migration
    const { error } = await supabase.rpc('exec', { sql: migrationSQL });
    
    if (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }
    
    console.log('✅ RAG migration applied successfully!');
    
    // Verify tables were created
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['personalities', 'personality_embeddings']);
    
    if (tablesError) {
      console.error('Error verifying tables:', tablesError);
    } else {
      console.log('Verified tables:', tables.map(t => t.table_name));
    }
    
  } catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  }
}

applyMigration();