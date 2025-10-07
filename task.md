# ChatGPT Clone - Complete Application Build Task

## Overview
Create a full-featured ChatGPT clone with React, TypeScript, Tailwind CSS, and Supabase backend. The application should be production-ready with authentication, chat management, AI personalities, settings, and export functionality.

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with dark mode support
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **AI Integration**: OpenAI API with streaming responses
- **State Management**: Zustand
- **UI Components**: Lucide React icons
- **Markdown**: react-markdown with syntax highlighting
- **Code Highlighting**: react-syntax-highlighter

## Core Features Required

### 1. Authentication System
- Email/password authentication via Supabase Auth
- Sign up, sign in, password reset functionality
- Beautiful auth UI with gradient backgrounds
- Form validation and error handling
- Auto-redirect after authentication
- Sign out functionality

### 2. Database Schema (Supabase)
Create these tables with RLS policies:

**users table** (handled by Supabase Auth)

**chats table**:
- id (text, primary key)
- user_id (uuid, foreign key to auth.users)
- title (text, default 'New Chat')
- payload (jsonb, nullable)
- created_at, updated_at (timestamps)
- RLS: Users can only access their own chats

**messages table**:
- id (uuid, primary key)
- chat_id (text, foreign key to chats)
- role (text, 'user' or 'assistant')
- content (text)
- created_at (timestamp)
- RLS: Users can only access messages from their chats

**user_settings table**:
- id (uuid, primary key)
- user_id (uuid, foreign key to auth.users)
- openai_api_key (text, encrypted)
- model (text, default 'gpt-4o')
- temperature (float, default 0.7)
- max_tokens (integer, default 2000)
- theme (text, 'light' or 'dark')
- created_at, updated_at (timestamps)
- RLS: Users can only access their own settings

**personalities table**:
- id (uuid, primary key)
- user_id (uuid, foreign key to auth.users)
- name (text)
- prompt (text)
- is_active (boolean, default false)
- has_memory (boolean, default true)
- created_at, updated_at (timestamps)
- RLS: Users can only access their own personalities

### 3. Main Application Layout
- Responsive sidebar (collapsible on mobile)
- Main chat area
- Modal overlays for settings and personalities
- Dark/light theme toggle
- Loading states throughout

### 4. Sidebar Features
- "New Chat" button
- List of all user chats (most recent first)
- Chat title editing (inline with save/cancel)
- Chat deletion with confirmation
- **Chat export functionality** - download as markdown file
- Settings button
- Sign out button
- Collapsible sidebar with hamburger menu

### 5. Chat Interface
- Message display with user/assistant distinction
- **Copy button for every message** (always visible below message)
- Markdown rendering for AI responses
- Code syntax highlighting (light/dark theme aware)
- Streaming response display with typing indicators
- Token usage tracking and display
- Auto-scroll to bottom
- Auto-resize textarea input
- Send on Enter, new line on Shift+Enter
- Disable input during AI generation

### 6. AI Integration (OpenAI)
- Streaming chat completions
- Support for multiple models (GPT-4o, GPT-4o-mini, GPT-4-turbo, GPT-3.5-turbo)
- Configurable temperature and max_tokens
- API key validation
- Error handling for API failures
- Token usage tracking and display
- System message injection for personalities

### 7. Settings Modal
- OpenAI API key input (password field with show/hide)
- API key validation with visual feedback
- Model selection dropdown
- Temperature slider (0-2, with labels: Focused/Balanced/Creative)
- Max tokens slider (100-4000)
- Theme selection (Light/Dark with visual previews)
- Save/Cancel buttons
- Form validation

### 8. AI Personalities System
- Create custom AI personalities with name and prompt
- Memory toggle per personality (include conversation history or not)
- Activate/deactivate personalities
- Edit existing personalities
- Delete personalities with confirmation
- Active personality indicator in chat header
- System message injection based on active personality
- Memory setting affects conversation context

### 9. Chat Export Feature
- Export button (download icon) in sidebar for each chat
- Export to markdown format with:
  - Chat title as header
  - Export timestamp
  - All messages formatted with user/assistant labels
  - Message timestamps
  - Proper markdown formatting
- Auto-download with filename: "ChatTitle-YYYY-MM-DDTHH-MM-SS.md"

### 10. UI/UX Requirements
- **Apple-level design aesthetics** - clean, sophisticated, premium feel
- Smooth animations and transitions
- Hover states for all interactive elements
- Loading spinners and states
- Error handling with user-friendly messages
- Responsive design (mobile-first)
- Consistent spacing (8px system)
- Proper color contrast for accessibility
- Visual feedback for all actions

### 11. State Management (Zustand)
Global state should include:
- User authentication state
- Current chat and messages
- All user chats
- User settings
- AI personalities
- UI state (sidebar open, modals, loading states)
- OpenAI service instance
- Token usage tracking

### 12. Security & Best Practices
- Row Level Security (RLS) on all database tables
- API key encryption (basic XOR encryption provided)
- Input validation and sanitization
- Error boundaries
- Proper TypeScript typing
- Clean code organization (multiple files, separation of concerns)

## File Structure
```
src/
├── components/
│   ├── Auth.tsx
│   ├── ChatArea.tsx
│   ├── Sidebar.tsx
│   ├── Settings.tsx
│   └── Personalities.tsx
├── lib/
│   ├── supabase.ts
│   ├── openai.ts
│   └── encryption.ts
├── store/
│   └── useStore.ts
├── App.tsx
├── main.tsx
└── index.css
```

## Specific Implementation Details

### Authentication Flow
- Check for existing session on app load
- Show auth form if not authenticated
- Support sign up, sign in, and password reset
- Handle auth state changes
- Auto-create default settings on first login

### Chat Management
- Auto-create chat on first message if none selected
- Update chat title based on first user message (truncated to 50 chars)
- Real-time message streaming with visual feedback
- Proper error handling for API failures

### Message Copying
- **CRITICAL**: Every message must have a visible "Copy" button below it
- Show "Copied!" feedback with green checkmark for 2 seconds
- Use navigator.clipboard.writeText() for copying

### Chat Export
- **CRITICAL**: Each chat in sidebar must have a download icon
- Export creates markdown file with full conversation
- Include timestamps, user/assistant labels, and proper formatting
- Auto-download with descriptive filename

### Personality System
- System messages are injected based on active personality
- Memory setting controls whether full conversation history is included
- Only one personality can be active at a time
- Personality prompt appears as system message in API calls

### Theme Support
- Dark mode class toggle on document root
- Theme-aware syntax highlighting
- Consistent colors across light/dark modes
- Theme persistence in user settings

## Environment Variables Required
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Key Dependencies
```json
{
  "@supabase/supabase-js": "^2.56.0",
  "lucide-react": "^0.344.0",
  "openai": "^5.16.0",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-markdown": "^10.1.0",
  "react-syntax-highlighter": "^15.6.6",
  "remark-gfm": "^4.0.1",
  "zustand": "^5.0.8"
}
```

## Critical Success Criteria
1. ✅ Full authentication flow working
2. ✅ Chat creation, selection, and deletion
3. ✅ Real-time AI responses with streaming
4. ✅ **Copy button on every message (always visible)**
5. ✅ **Chat export to markdown functionality**
6. ✅ Settings modal with API key validation
7. ✅ AI personalities with memory control
8. ✅ Dark/light theme switching
9. ✅ Responsive design
10. ✅ Token usage tracking
11. ✅ Proper error handling
12. ✅ Clean, production-ready code

## Testing Checklist
- [ ] Sign up/sign in/sign out flows
- [ ] Chat creation and message sending
- [ ] AI response streaming
- [ ] Message copying functionality
- [ ] Chat export to markdown
- [ ] Settings persistence
- [ ] Personality creation and activation
- [ ] Theme switching
- [ ] Mobile responsiveness
- [ ] Error handling (invalid API key, network issues)

This prompt should enable complete recreation of the ChatGPT clone with all features intact.