# ChatGPT Clone with OpenAI Integration

A modern, secure ChatGPT clone built with React, TypeScript, and OpenAI API. This application features real-time chat streaming, multiple AI personalities, conversation management, and a dark mode interface.

## Technology Stack

### Frontend
- **React 18** - Modern UI library with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **Zustand** - Lightweight state management

### Backend & Services
- **Supabase** - Authentication and data storage
- **OpenAI API** - GPT models for chat completions
- **React Markdown** - Markdown rendering for AI responses
- **React Syntax Highlighter** - Code syntax highlighting

### Development Tools
- **ESLint** - Code linting
- **TypeScript ESLint** - TypeScript-specific linting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

## Features

### Core Functionality
- Real-time AI chat with streaming responses
- Multiple chat conversations with persistent storage
- Custom AI personalities with configurable system prompts
- Message history with context preservation
- Token usage tracking and display
- Copy message functionality
- Auto-scrolling chat interface

### User Experience
- Clean, modern UI with responsive design
- Dark mode and light mode themes
- Real-time typing indicators
- Auto-resizing text input
- Keyboard shortcuts (Enter to send, Shift+Enter for new line)
- Email/password authentication with Supabase
- Password reset functionality

### AI Configuration
- Multiple GPT model selection (GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-3.5 Turbo)
- Adjustable temperature (creativity level)
- Configurable max tokens (response length)
- Custom API key support

### Personality System
- Pre-configured AI personalities (General Assistant, Code Expert, Creative Writer)
- Create custom personalities
- Edit and delete personalities
- Optional memory feature for context retention
- System prompt customization

## Requirements

- Node.js 16.x or higher
- npm 7.x or higher
- OpenAI API key (get one at https://platform.openai.com/api-keys)
- Supabase account and project (for authentication)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ChatOpenAIIntegration.git
cd ChatOpenAIIntegration
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Configure Supabase:

Run the following SQL in your Supabase SQL editor to set up the database schema:

```sql
-- Create settings table
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  openai_api_key TEXT,
  model TEXT DEFAULT 'gpt-4o',
  temperature DECIMAL DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2000,
  theme TEXT DEFAULT 'light',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create chats table
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT DEFAULT 'New Chat',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID REFERENCES public.chats ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  token_usage JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create personalities table
CREATE TABLE IF NOT EXISTS public.personalities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  has_memory BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personalities ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own settings" ON public.settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON public.settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON public.settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own chats" ON public.chats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chats" ON public.chats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats" ON public.chats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chats" ON public.chats
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view messages in their chats" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in their chats" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages in their chats" ON public.messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own personalities" ON public.personalities
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own personalities" ON public.personalities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own personalities" ON public.personalities
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own personalities" ON public.personalities
  FOR DELETE USING (auth.uid() = user_id);
```

## Running the Application

### Development Mode

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or another port if 5173 is busy).

### Production Build

Build the application for production:
```bash
npm run build
```

The optimized production build will be created in the `dist` directory.

### Preview Production Build

Preview the production build locally:
```bash
npm run preview
```

## Project Structure

```
ChatOpenAIIntegration/
├── src/
│   ├── components/
│   │   ├── Auth.tsx           # Authentication component
│   │   ├── ChatArea.tsx       # Main chat interface
│   │   ├── Personalities.tsx  # AI personalities management
│   │   ├── Settings.tsx       # User settings panel
│   │   └── Sidebar.tsx        # Navigation sidebar
│   ├── lib/
│   │   ├── openai.ts          # OpenAI service integration
│   │   └── supabase.ts        # Supabase client setup
│   ├── store/
│   │   └── useStore.ts        # Zustand state management
│   ├── App.tsx                # Main application component
│   ├── main.tsx               # Application entry point
│   └── index.css              # Global styles
├── public/                    # Static assets
├── index.html                 # HTML template
├── vite.config.ts            # Vite configuration
├── tailwind.config.js        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
└── package.json              # Project dependencies
```

## Security Features

This application implements comprehensive security measures to protect user data and prevent common vulnerabilities:

### Input Validation & Sanitization
- Email format validation with regex patterns
- Password length requirements (minimum 6 characters)
- Message length limits (maximum 10,000 characters)
- XSS prevention through input sanitization
- Removal of potentially dangerous characters from API keys

### HTTP Security Headers
- **Content Security Policy (CSP)** - Restricts resource loading to prevent XSS attacks
- **X-Content-Type-Options** - Prevents MIME type sniffing
- **X-Frame-Options** - Prevents clickjacking attacks
- **X-XSS-Protection** - Enables browser XSS filtering
- **Referrer-Policy** - Controls referrer information disclosure

### Build Security
- Source maps disabled in production builds
- Console logs removed from production code
- Terser minification for code obfuscation
- HTTPS-only connections to external APIs

### Data Security
- Row Level Security (RLS) enabled on all Supabase tables
- User-specific data access policies
- Secure API key storage (client-side only, not committed to repo)
- Environment variables for sensitive configuration

### Authentication Security
- Supabase Auth with email/password
- Secure password reset flow
- Session management with automatic token refresh
- Protected routes requiring authentication

## Usage

1. **Sign Up/Login**: Create an account or sign in with existing credentials
2. **Configure Settings**: Add your OpenAI API key in Settings (gear icon)
3. **Start Chatting**: Type your message and press Enter or click Send
4. **Create Personalities**: Customize AI behavior with different personalities
5. **Manage Conversations**: Create, switch between, and delete chat conversations
6. **Toggle Theme**: Switch between light and dark modes in Settings

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key | Yes |

## Known Issues & Limitations

- The application uses `dangerouslyAllowBrowser: true` for OpenAI client (suitable for demo purposes, but production apps should use a backend proxy)
- API keys are stored in Supabase but transmitted to browser (consider using a backend service for production)
- Some npm dependencies have known vulnerabilities (see Security section below)

## Remaining Vulnerabilities

After running `npm audit fix`, the following vulnerabilities remain:

- **@eslint/plugin-kit** - ReDoS vulnerability (low severity)
- **esbuild** - Development server security issue (moderate severity)
- **prismjs** - DOM Clobbering vulnerability (moderate severity)

These are either:
- Development dependencies that don't affect production builds
- Require breaking changes to fix (`npm audit fix --force`)
- Low risk in the context of this application

For production deployment, consider:
- Using `npm audit fix --force` to apply breaking changes if acceptable
- Implementing a Content Security Policy
- Using a backend proxy for OpenAI API calls
- Regular dependency updates

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is open source and available under the MIT License.

## Acknowledgments

- OpenAI for the GPT API
- Supabase for authentication and database services
- The React and TypeScript communities
- All open-source contributors whose libraries made this project possible

## Support

For issues, questions, or contributions, please open an issue on GitHub.

---

Built with React, TypeScript, and OpenAI API
