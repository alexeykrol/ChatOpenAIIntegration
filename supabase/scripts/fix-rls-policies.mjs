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

async function fixPolicies() {
  console.log('🔧 Fixing RLS policies...\n');

  // Drop existing policies first
  await executeSql(`
    DROP POLICY IF EXISTS "Users can view own chat summaries" ON summaries;
    DROP POLICY IF EXISTS "Users can update own chat summaries" ON summaries;
    DROP POLICY IF EXISTS "Users can insert own chat summaries" ON summaries;
    DROP POLICY IF EXISTS "Users can view own chat summary events" ON summary_events;
    DROP POLICY IF EXISTS "Users can insert own chat summary events" ON summary_events;
  `, 'Dropping old policies');

  // Create fixed policies with proper UUID casting
  await executeSql(`
    CREATE POLICY "Users can view own chat summaries" 
      ON summaries FOR SELECT 
      USING (
        EXISTS (
          SELECT 1 FROM chats 
          WHERE chats.id = summaries.thread_id 
          AND chats.user_id::text = auth.uid()::text
        )
      )
  `, 'Creating fixed policy: view summaries');

  await executeSql(`
    CREATE POLICY "Users can update own chat summaries" 
      ON summaries FOR UPDATE 
      USING (
        EXISTS (
          SELECT 1 FROM chats 
          WHERE chats.id = summaries.thread_id 
          AND chats.user_id::text = auth.uid()::text
        )
      )
  `, 'Creating fixed policy: update summaries');

  await executeSql(`
    CREATE POLICY "Users can insert own chat summaries" 
      ON summaries FOR INSERT 
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM chats 
          WHERE chats.id = summaries.thread_id 
          AND chats.user_id::text = auth.uid()::text
        )
      )
  `, 'Creating fixed policy: insert summaries');

  await executeSql(`
    CREATE POLICY "Users can view own chat summary events" 
      ON summary_events FOR SELECT 
      USING (
        EXISTS (
          SELECT 1 FROM chats 
          WHERE chats.id = summary_events.thread_id 
          AND chats.user_id::text = auth.uid()::text
        )
      )
  `, 'Creating fixed policy: view events');

  await executeSql(`
    CREATE POLICY "Users can insert own chat summary events" 
      ON summary_events FOR INSERT 
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM chats 
          WHERE chats.id = summary_events.thread_id 
          AND chats.user_id::text = auth.uid()::text
        )
      )
  `, 'Creating fixed policy: insert events');

  console.log('\n✨ Policies fixed!');
}

fixPolicies().catch(console.error);