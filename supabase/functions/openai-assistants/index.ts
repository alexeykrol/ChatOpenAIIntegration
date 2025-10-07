/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Rate limiting
    const rateLimit = await checkRateLimit(user.id, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, 60, 60);

    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          resetAt: rateLimit.resetAt.toISOString(),
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    // 3. Parse request
    const { action, payload } = await req.json();

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Missing action parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Route to appropriate OpenAI Assistants API endpoint
    let endpoint = '';
    let method = 'GET';
    let body: any = null;

    switch (action) {
      case 'create_assistant':
        endpoint = 'https://api.openai.com/v1/assistants';
        method = 'POST';
        body = payload;
        break;

      case 'update_assistant':
        endpoint = `https://api.openai.com/v1/assistants/${payload.assistant_id}`;
        method = 'POST';
        body = payload.data;
        break;

      case 'delete_assistant':
        endpoint = `https://api.openai.com/v1/assistants/${payload.assistant_id}`;
        method = 'DELETE';
        break;

      case 'create_thread':
        endpoint = 'https://api.openai.com/v1/threads';
        method = 'POST';
        body = payload || {};
        break;

      case 'add_message':
        endpoint = `https://api.openai.com/v1/threads/${payload.thread_id}/messages`;
        method = 'POST';
        body = { role: 'user', content: payload.content };
        break;

      case 'run_assistant':
        endpoint = `https://api.openai.com/v1/threads/${payload.thread_id}/runs`;
        method = 'POST';
        body = { assistant_id: payload.assistant_id };
        break;

      case 'get_run':
        endpoint = `https://api.openai.com/v1/threads/${payload.thread_id}/runs/${payload.run_id}`;
        method = 'GET';
        break;

      case 'list_messages':
        endpoint = `https://api.openai.com/v1/threads/${payload.thread_id}/messages`;
        method = 'GET';
        break;

      case 'upload_file':
        endpoint = 'https://api.openai.com/v1/files';
        method = 'POST';
        // For file uploads, we need FormData
        const formData = new FormData();
        formData.append('purpose', 'assistants');
        formData.append('file', payload.file);
        body = formData;
        break;

      case 'delete_file':
        endpoint = `https://api.openai.com/v1/files/${payload.file_id}`;
        method = 'DELETE';
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // 5. Call OpenAI API
    const headers: Record<string, string> = {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'OpenAI-Beta': 'assistants=v2',
    };

    if (!(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const openaiResponse = await fetch(endpoint, {
      method,
      headers,
      body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : null,
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('OpenAI API error:', error);
      return new Response(
        JSON.stringify({ error: 'OpenAI API request failed', details: error }),
        { status: openaiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await openaiResponse.json();
    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': String(rateLimit.remaining),
      },
    });
  } catch (error) {
    console.error('Edge Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
