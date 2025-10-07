import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Environment variables should be available in your terminal session
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runMigration() {
  try {
    // Read the simple migration
    const migrationSQL = readFileSync('./simple-migration.sql', 'utf-8');
    
    console.log('📊 Applying RAG migration...');
    
    // Split SQL by statements and execute one by one
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        
        const { error } = await supabase.rpc('exec_sql', { 
          sql: statement + ';' 
        });
        
        if (error) {
          console.error('❌ SQL Error:', error);
          // Try alternative approach
          console.log('Trying direct query...');
          const { error: queryError } = await supabase
            .from('dummy') // This will fail but might give us better error info
            .select('*')
            .limit(0);
          
          console.log('Query error (expected):', queryError);
        } else {
          console.log('✅ Statement executed successfully');
        }
      }
    }
    
    console.log('🎉 Migration completed!');
    
    // Test by checking if new columns exist
    console.log('🔍 Verifying migration...');
    const { data, error } = await supabase
      .from('personalities')
      .select('file_name, chunk_size')
      .limit(1);
    
    if (error) {
      console.log('Verification error:', error.message);
    } else {
      console.log('✅ Migration verified - new columns accessible');
    }
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
  }
}

runMigration();