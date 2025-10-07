import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkDBStructure() {
  try {
    console.log('🔍 Analyzing personalities table structure...\n');
    
    // Get column information
    const { data: columns, error } = await supabase.rpc('exec_sql', {
      sql: `SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'personalities' 
            ORDER BY ordinal_position;`
    });
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    console.log('📊 Current personalities table structure:');
    console.log('─'.repeat(80));
    columns.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(not null)';
      const defaultVal = col.column_default ? ` default: ${col.column_default}` : '';
      console.log(`  ${col.column_name.padEnd(20)} | ${col.data_type.padEnd(15)} | ${nullable}${defaultVal}`);
    });
    
    console.log('\n🔍 Analyzing for potential legacy fields...\n');
    
    // Check for potentially unused fields
    const legacyFields = columns.filter(col => {
      const name = col.column_name.toLowerCase();
      return name.includes('chunk') || 
             name.includes('embedding') || 
             name.includes('top_') ||
             name === 'file_name' ||
             name === 'uploaded_at' ||
             name === 'openai_file_id';
    });
    
    if (legacyFields.length > 0) {
      console.log('⚠️  Potential legacy fields found:');
      legacyFields.forEach(field => {
        console.log(`  - ${field.column_name} (${field.data_type}) - might be from old RAG implementation`);
      });
    } else {
      console.log('✅ No obvious legacy fields detected');
    }
    
    // Get some sample data
    const { data: sampleData, error: sampleError } = await supabase
      .from('personalities')
      .select('id, name, files, file_instruction, chunk_size, embedding_model')
      .limit(3);
    
    if (!sampleError && sampleData?.length > 0) {
      console.log('\n📋 Sample data:');
      sampleData.forEach(p => {
        console.log(`  ${p.name}:`);
        console.log(`    files: ${JSON.stringify(p.files)}`);
        console.log(`    file_instruction: ${p.file_instruction || 'null'}`);
        console.log(`    chunk_size: ${p.chunk_size || 'null'}`);
        console.log(`    embedding_model: ${p.embedding_model || 'null'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

checkDBStructure();