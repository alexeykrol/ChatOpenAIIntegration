import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyMigration() {
  try {
    console.log('📊 Applying RAG migration step by step...');
    
    // First, let's check current schema
    console.log('🔍 Checking current personalities table...');
    const { data: currentColumns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'personalities' })
      .single();
    
    if (columnsError) {
      console.log('Cannot check columns with RPC, trying direct query...');
      
      // Try to query existing table to see what columns exist
      const { data: sampleData, error: sampleError } = await supabase
        .from('personalities')
        .select('*')
        .limit(1);
        
      if (sampleError) {
        console.log('Sample query error:', sampleError.message);
      } else {
        console.log('Current table structure detected');
        console.log('Sample data keys:', sampleData?.[0] ? Object.keys(sampleData[0]) : 'No data');
      }
    }
    
    console.log('✅ Ready to apply migration');
    console.log('');
    console.log('🚨 IMPORTANT: The migration needs to be applied manually through Supabase Dashboard');
    console.log('');
    console.log('Please follow these steps:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Open your project: oqlurxlsdskvkrudxntz');
    console.log('3. Go to SQL Editor');
    console.log('4. Copy and paste the content from simple-migration.sql');
    console.log('5. Run the SQL');
    console.log('');
    console.log('The migration file contains:');
    console.log('- New columns for personalities table (file_name, file_instruction, etc.)');
    console.log('- New personality_embeddings table');
    console.log('- RLS security policies');
    console.log('');
    
    // Let's test if we can at least read from the database
    const { data: testData, error: testError } = await supabase
      .from('personalities')
      .select('id, name')
      .limit(3);
    
    if (testError) {
      console.log('❌ Database access error:', testError.message);
    } else {
      console.log('✅ Database connection verified');
      console.log(`Found ${testData?.length || 0} personalities in the database`);
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

applyMigration();