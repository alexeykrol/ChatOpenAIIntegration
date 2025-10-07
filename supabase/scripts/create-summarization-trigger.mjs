#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function executeSql(sql, description) {
  console.log(`📋 ${description}...`);
  
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  
  if (error) {
    if (error.message.includes('already exists')) {
      console.log(`✓ Already exists`);
      return true;
    }
    console.error(`❌ Error: ${error.message}`);
    return false;
  }
  
  console.log(`✅ Success`);
  return true;
}

async function createSummarizationTrigger() {
  console.log('🚀 Creating summarization trigger...\n');

  // 1. Create function to handle new assistant messages
  await executeSql(`
    CREATE OR REPLACE FUNCTION handle_new_assistant_message()
    RETURNS TRIGGER AS $$
    DECLARE
      user_msg_id UUID;
      base_url TEXT;
    BEGIN
      -- Only process assistant messages
      IF NEW.role != 'assistant' THEN
        RETURN NEW;
      END IF;
      
      -- Find the corresponding user message (most recent before this assistant message)
      SELECT id INTO user_msg_id
      FROM messages
      WHERE thread_id = NEW.thread_id 
        AND role = 'user'
        AND created_at < NEW.created_at
      ORDER BY created_at DESC
      LIMIT 1;
      
      -- If no user message found, skip
      IF user_msg_id IS NULL THEN
        RETURN NEW;
      END IF;
      
      -- Get base URL from current environment
      -- This should be set as environment variable in Supabase
      base_url := COALESCE(current_setting('app.base_url', true), 'http://localhost:3000');
      
      -- Make HTTP request to summarization API
      PERFORM
        net.http_post(
          url := base_url || '/api/retrieval/summarize',
          headers := jsonb_build_object(
            'Content-Type', 'application/json'
          ),
          body := jsonb_build_object(
            'thread_id', NEW.thread_id::text,
            'user_msg_id', user_msg_id::text,
            'assistant_msg_id', NEW.id::text
          )
        );
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `, 'Creating trigger function');

  // 2. Create trigger on messages table
  await executeSql(`
    DROP TRIGGER IF EXISTS trigger_summarize_assistant_message ON messages;
    
    CREATE TRIGGER trigger_summarize_assistant_message
      AFTER INSERT ON messages
      FOR EACH ROW
      EXECUTE FUNCTION handle_new_assistant_message();
  `, 'Creating trigger on messages table');

  // 3. Enable pg_net extension if not already enabled
  await executeSql(`
    CREATE EXTENSION IF NOT EXISTS pg_net;
  `, 'Enabling pg_net extension');

  // 4. Grant necessary permissions
  await executeSql(`
    GRANT USAGE ON SCHEMA net TO postgres, anon, authenticated, service_role;
  `, 'Granting permissions for pg_net');

  // 5. Set environment variable for base URL (if not set)
  // Note: This needs to be set in Supabase dashboard or via SQL
  console.log('\n📝 Manual step required:');
  console.log('Set the base URL in Supabase dashboard:');
  console.log('Settings → Environment Variables → Add:');
  console.log('Key: APP_BASE_URL');
  console.log('Value: https://your-app-domain.com (or http://localhost:3000 for dev)');

  console.log('\n✨ Summarization trigger created successfully!');
  console.log('\n🔧 How it works:');
  console.log('1. When assistant message is inserted into messages table');
  console.log('2. Trigger finds corresponding user message');
  console.log('3. Makes HTTP POST to /api/retrieval/summarize');
  console.log('4. API processes summarization asynchronously');
  console.log('\n⚠️  Make sure your Next.js app is running for triggers to work!');
}

createSummarizationTrigger().catch(console.error);