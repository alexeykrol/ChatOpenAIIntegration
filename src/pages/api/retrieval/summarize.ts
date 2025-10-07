// API route for processing message summarization
// Called by Supabase trigger when new assistant messages are created

import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { summarizationService } from '../../../retrieval/summarization';
import { summaryDb } from '../../../retrieval/services/database';

interface SummarizeRequest {
  thread_id: string;
  user_msg_id: string;
  assistant_msg_id: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { thread_id, user_msg_id, assistant_msg_id } = req.body as SummarizeRequest;

    if (!thread_id || !user_msg_id || !assistant_msg_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: thread_id, user_msg_id, assistant_msg_id' 
      });
    }

    console.log(`🤖 Processing summarization for thread ${thread_id}`);

    // 1. Get thread owner and check if summarization is enabled
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('user_id')
      .eq('id', thread_id)
      .single();

    if (chatError || !chat) {
      console.log('Thread not found or error:', chatError);
      return res.status(404).json({ error: 'Thread not found' });
    }

    // 2. Check if summarization is enabled for user
    const memorySettings = await summaryDb.getUserMemorySettings(chat.user_id);
    if (!memorySettings?.use_summarization) {
      console.log('Summarization disabled for user');
      return res.status(200).json({ 
        success: true, 
        message: 'Summarization disabled' 
      });
    }

    // 3. Get user's OpenAI API key
    const { data: settings } = await supabase
      .from('user_settings')
      .select('openai_api_key')
      .eq('user_id', chat.user_id)
      .single();

    if (!settings?.openai_api_key) {
      console.log('No OpenAI API key found for user');
      return res.status(400).json({ error: 'OpenAI API key required' });
    }

    // 4. Initialize OpenAI service
    summarizationService.initializeOpenAI(settings.openai_api_key);

    // 5. Get message pair
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('id, role, content')
      .in('id', [user_msg_id, assistant_msg_id])
      .order('created_at', { ascending: true });

    if (msgError || !messages || messages.length !== 2) {
      console.log('Failed to fetch message pair:', msgError);
      return res.status(400).json({ error: 'Failed to fetch message pair' });
    }

    const userMessage = messages.find(m => m.role === 'user');
    const assistantMessage = messages.find(m => m.role === 'assistant');

    if (!userMessage || !assistantMessage) {
      return res.status(400).json({ error: 'Invalid message pair' });
    }

    // 6. Process summarization
    const result = await summarizationService.processPair({
      thread_id,
      user_message: userMessage.content,
      assistant_message: assistantMessage.content,
      user_msg_id: userMessage.id,
      assistant_msg_id: assistantMessage.id
    });

    if (!result.success) {
      console.error('Summarization failed:', result.error);
      return res.status(500).json({ error: result.error });
    }

    console.log('✅ Summarization completed successfully');

    return res.status(200).json({
      success: true,
      summary: {
        version: result.summary?.version,
        core_text_length: result.summary?.core_text?.length || 0,
        facts_count: Object.keys(result.summary?.facts || {}).length,
        decisions_count: result.summary?.decisions?.length || 0
      },
      changes: result.changes
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}