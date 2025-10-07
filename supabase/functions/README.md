# Supabase Edge Functions - OpenAI Proxy

Secure backend proxy for OpenAI API calls. API keys never exposed to browser.

## 📁 Structure

```
functions/
├── _shared/
│   ├── cors.ts           # CORS headers
│   └── rateLimit.ts      # Rate limiting logic
├── openai-chat/
│   └── index.ts          # Chat completions endpoint
└── openai-assistants/
    └── index.ts          # Assistants API endpoint
```

## 🚀 Deployment

### Prerequisites

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link to your project:
```bash
supabase link --project-ref your-project-ref
```

### Deploy Functions

Deploy all functions:
```bash
supabase functions deploy openai-chat
supabase functions deploy openai-assistants
```

### Set Secrets

Set your OpenAI API key (server-side only, never in browser):
```bash
supabase secrets set OPENAI_API_KEY=sk-proj-your-api-key-here
```

Verify secrets:
```bash
supabase secrets list
```

## 📡 API Endpoints

### 1. Chat Completions

**Endpoint:** `POST /functions/v1/openai-chat`

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "Hello!" }
  ],
  "model": "gpt-4",
  "temperature": 0.7,
  "stream": true
}
```

**Headers:**
```
Authorization: Bearer {supabase_user_token}
Content-Type: application/json
```

**Response (streaming):**
```
data: {"choices":[{"delta":{"content":"Hello"}}]}
data: {"choices":[{"delta":{"content":" there"}}]}
data: [DONE]
```

**Response (non-streaming):**
```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you?"
      }
    }
  ]
}
```

**Rate Limit Headers:**
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 2025-10-06T12:00:00Z
```

### 2. Assistants API

**Endpoint:** `POST /functions/v1/openai-assistants`

**Actions:**

#### Create Assistant
```json
{
  "action": "create_assistant",
  "payload": {
    "name": "My Assistant",
    "instructions": "You are a helpful assistant",
    "model": "gpt-4"
  }
}
```

#### Update Assistant
```json
{
  "action": "update_assistant",
  "payload": {
    "assistant_id": "asst_abc123",
    "data": {
      "instructions": "Updated instructions"
    }
  }
}
```

#### Delete Assistant
```json
{
  "action": "delete_assistant",
  "payload": {
    "assistant_id": "asst_abc123"
  }
}
```

#### Create Thread
```json
{
  "action": "create_thread",
  "payload": {}
}
```

#### Add Message
```json
{
  "action": "add_message",
  "payload": {
    "thread_id": "thread_abc123",
    "content": "Hello!"
  }
}
```

#### Run Assistant
```json
{
  "action": "run_assistant",
  "payload": {
    "thread_id": "thread_abc123",
    "assistant_id": "asst_abc123"
  }
}
```

#### Get Run Status
```json
{
  "action": "get_run",
  "payload": {
    "thread_id": "thread_abc123",
    "run_id": "run_abc123"
  }
}
```

#### List Messages
```json
{
  "action": "list_messages",
  "payload": {
    "thread_id": "thread_abc123"
  }
}
```

## 🔒 Security Features

### 1. Authentication
- All requests require valid Supabase user token
- Anonymous access blocked

### 2. Rate Limiting
- 60 requests per minute per user (configurable)
- Automatic window reset
- Rate limit headers in response

### 3. Input Validation
- Message length limit: 10,000 characters
- Messages sanitized before sending to OpenAI
- Invalid requests rejected

### 4. API Key Protection
- OpenAI API key stored server-side only
- Never exposed to browser
- Accessible only to Edge Functions

### 5. Error Handling
- Generic errors returned to user
- Detailed errors logged server-side only
- No internal information leakage

## 📊 Rate Limiting

Default limits:
- **Requests:** 60 per minute
- **Window:** Rolling 60-second window
- **Storage:** Postgres table `api_rate_limits`

Customize in Edge Function:
```typescript
const rateLimit = await checkRateLimit(
  user.id,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  100, // limit
  60   // window in seconds
);
```

## 🔧 Local Development

### Run Functions Locally

1. Start Supabase locally:
```bash
supabase start
```

2. Serve functions:
```bash
supabase functions serve --env-file .env.local
```

3. Test endpoint:
```bash
curl -i --location --request POST \
  'http://localhost:54321/functions/v1/openai-chat' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"messages":[{"role":"user","content":"Hello"}]}'
```

### Environment Variables

Create `.env.local` for local development:
```bash
OPENAI_API_KEY=sk-proj-your-key-here
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**⚠️ Never commit `.env.local` to git!**

## 📝 Logging

Edge Functions automatically log to Supabase Logs.

View logs:
```bash
supabase functions logs openai-chat
supabase functions logs openai-assistants
```

Or in Supabase Dashboard:
```
Project → Edge Functions → Function Name → Logs
```

## 🐛 Debugging

### Check Function Status
```bash
supabase functions list
```

### View Recent Errors
```bash
supabase functions logs openai-chat --tail
```

### Test Authentication
```typescript
// In browser console
const { data: { session } } = await supabase.auth.getSession();
console.log('Token:', session?.access_token);
```

### Test Rate Limiting
```bash
# Send 65 requests rapidly
for i in {1..65}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"role":"user","content":"test"}]}' \
    https://your-project.supabase.co/functions/v1/openai-chat
done
# First 60 should return 200, next 5 should return 429
```

## 🚨 Monitoring

### Metrics to Track

1. **Request Count:** Total API requests
2. **Error Rate:** Failed requests / Total requests
3. **Rate Limit Hits:** 429 responses
4. **OpenAI Costs:** Track via OpenAI dashboard
5. **Response Time:** Average latency

### Set Up Alerts

Create alerts in Supabase Dashboard:
- Error rate > 5%
- Rate limit hits > 100/hour
- Function crashes

## 🔄 Updating Functions

1. Make changes to function code
2. Deploy:
```bash
supabase functions deploy openai-chat
```
3. Test in production
4. Monitor logs for errors

## 📚 Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Deno Runtime](https://deno.land/manual)

## ⚠️ Important Notes

1. **Never** commit API keys or secrets
2. **Always** test locally before deploying
3. **Monitor** OpenAI usage and costs
4. **Review** logs regularly for errors
5. **Update** rate limits based on usage patterns
