# Security Issues and Fixes

**Project:** ChatOpenAI Integration Assistant
**Date:** 2025-10-06
**Status:** CRITICAL ISSUES IDENTIFIED - FIXES IN PROGRESS

---

## ⚠️ CRITICAL: OpenAI API Key Exposure in Browser

### Current Issue

The application currently uses `dangerouslyAllowBrowser: true` when initializing the OpenAI client in the browser:

```typescript
// src/lib/openai.ts (Line 99-102)
this.openai = new OpenAI({
  apiKey: trimmedKey,
  dangerouslyAllowBrowser: true  // ⚠️ SECURITY RISK
});
```

### Why This Is Dangerous

1. **API key visible in browser:** Any user can open DevTools → Network tab and see the API key in request headers
2. **API key in memory:** Can be extracted using browser debugging tools
3. **Key theft:** Attackers can steal your OpenAI API key and use your credits
4. **No rate limiting:** Stolen keys can be used to drain your OpenAI account

### Exploitation Example

```javascript
// In browser console, attacker can easily access:
useStore.getState().settings.openai_api_key
// Returns: "sk-proj-..."

// Or intercept network requests to see:
// Authorization: Bearer sk-proj-...
```

---

## ✅ RECOMMENDED SOLUTION: Backend Proxy

### Architecture

Instead of calling OpenAI directly from the browser, proxy all requests through a secure backend:

```
Browser → Supabase Edge Function → OpenAI API
         (with auth check)        (server-side key)
```

### Implementation Steps

#### 1. Create Supabase Edge Function

Create `supabase/functions/openai-proxy/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY'); // Server-side only

serve(async (req) => {
  // 1. Authenticate user
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. Rate limiting (check user's request count)
  const { data: rateLimitData } = await supabase
    .from('api_rate_limits')
    .select('request_count, window_start')
    .eq('user_id', user.id)
    .single();

  if (rateLimitData && rateLimitData.request_count > 60) {
    return new Response('Rate limit exceeded', { status: 429 });
  }

  // 3. Proxy request to OpenAI
  const body = await req.json();
  const { messages, model, stream } = body;

  const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`, // Server-side key
    },
    body: JSON.stringify({
      model: model || 'gpt-4',
      messages,
      stream,
    }),
  });

  // 4. Increment rate limit counter
  await supabase.rpc('increment_rate_limit', { user_id: user.id });

  // 5. Stream response back to client
  return new Response(openaiResponse.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
});
```

#### 2. Update Frontend to Use Proxy

Modify `src/lib/openai.ts`:

```typescript
// REMOVE direct OpenAI client initialization
// REMOVE dangerouslyAllowBrowser

class OpenAIService {
  // Instead of OpenAI client, use fetch to backend
  async streamChat(messages: Message[], model: string) {
    const supabase = createClient(/* ... */);
    const session = await supabase.auth.getSession();

    const response = await fetch('/functions/v1/openai-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.data.session?.access_token}`,
      },
      body: JSON.stringify({
        messages,
        model,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.body; // Stream response
  }
}
```

#### 3. Environment Variables

```bash
# .env (frontend)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# Supabase Edge Function secrets (server-side only)
# Set in: Supabase Dashboard → Edge Functions → Secrets
OPENAI_API_KEY=sk-proj-...
```

#### 4. Database Schema for Rate Limiting

```sql
-- Create rate limiting table
CREATE TABLE api_rate_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  request_count INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to increment rate limit
CREATE OR REPLACE FUNCTION increment_rate_limit(user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO api_rate_limits (user_id, request_count, window_start)
  VALUES (user_id, 1, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    request_count = CASE
      WHEN api_rate_limits.window_start < NOW() - INTERVAL '1 minute' THEN 1
      ELSE api_rate_limits.request_count + 1
    END,
    window_start = CASE
      WHEN api_rate_limits.window_start < NOW() - INTERVAL '1 minute' THEN NOW()
      ELSE api_rate_limits.window_start
    END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policies
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rate limits"
  ON api_rate_limits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

---

## 🔒 Additional Security Improvements

### 1. Input Validation

Always validate and sanitize user inputs before sending to OpenAI:

```typescript
function sanitizeMessage(message: string): string {
  // Length limit
  if (message.length > 10000) {
    throw new Error('Message too long');
  }

  // Remove potentially dangerous patterns
  return message
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}
```

### 2. Prompt Injection Detection

```typescript
function detectPromptInjection(message: string): boolean {
  const suspiciousPatterns = [
    /IGNORE\s+PREVIOUS\s+INSTRUCTIONS/i,
    /You\s+are\s+now/i,
    /system:\s*$/i,
    /\/admin/i,
  ];

  return suspiciousPatterns.some(pattern => pattern.test(message));
}

// Usage
if (detectPromptInjection(message)) {
  console.warn('Potential prompt injection detected');
  // Log for review, or reject the message
}
```

### 3. Response Filtering

Filter OpenAI responses to prevent sensitive data leakage:

```typescript
function filterResponse(response: string): string {
  // Remove potential API keys
  return response.replace(/sk-[a-zA-Z0-9]{32,}/g, '[REDACTED]');
}
```

---

## 📋 Migration Checklist

To migrate from browser-based to server-based OpenAI integration:

- [ ] Create Supabase Edge Function for OpenAI proxy
- [ ] Add OPENAI_API_KEY to Supabase Edge Function secrets
- [ ] Create rate limiting database tables
- [ ] Update frontend to call proxy instead of OpenAI directly
- [ ] Remove `dangerouslyAllowBrowser` from code
- [ ] Remove OpenAI API key from browser localStorage/database
- [ ] Test authentication flow
- [ ] Test rate limiting
- [ ] Test streaming responses
- [ ] Update documentation
- [ ] Deploy to production

---

## 🚀 Alternative Solutions

### Option 1: Assistants API (Current Approach)

Continue using OpenAI Assistants API but:
- Store API key server-side only
- Create backend endpoint for assistant operations
- Never expose API key to browser

### Option 2: Bring Your Own Key (BYOK)

Allow users to provide their own OpenAI API keys:
- **Pros:** No server-side costs, user controls their usage
- **Cons:** Users must have OpenAI accounts, complexity in UI
- **Security:** Still need to encrypt keys, warn users about exposure

### Option 3: Hybrid Approach

- Free tier: Server-side API key with strict rate limits
- Premium tier: Users provide their own keys (with proper warnings)

---

## 📚 References

- [OpenAI API Security Best Practices](https://platform.openai.com/docs/guides/production-best-practices)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)

---

## 🔄 Status

**Current Status:** ⚠️ VULNERABLE - API keys exposed in browser
**Recommended Action:** Implement backend proxy immediately
**Timeline:** 1-2 days for full migration
**Priority:** CRITICAL

---

*Last Updated: 2025-10-06*
