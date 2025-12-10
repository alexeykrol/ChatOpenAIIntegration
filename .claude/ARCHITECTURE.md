# ARCHITECTURE — ChatOpenAII

*Документация архитектуры и структуры кода*

## Обзор

ChatGPT клон с real-time streaming, AI персоналиями и Supabase backend.

**Tech Stack:**
- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **State:** Zustand
- **Backend:** Supabase (Auth + PostgreSQL)
- **AI:** OpenAI API

## Структура директорий

```
ChatOpenAII/
├── src/
│   ├── components/           # UI компоненты
│   │   ├── Auth.tsx          # Авторизация (206 строк)
│   │   ├── ChatArea.tsx      # Чат интерфейс (~200 строк)
│   │   ├── Sidebar.tsx       # Навигация (~80 строк)
│   │   ├── Settings.tsx      # Настройки (~100 строк)
│   │   └── Personalities.tsx # AI персоналии (~100 строк)
│   │
│   ├── lib/                  # Сервисный слой
│   │   ├── openai.ts         # OpenAI service (109 строк)
│   │   ├── supabase.ts       # Database client (137 строк)
│   │   └── encryption.ts     # XOR encryption (57 строк)
│   │
│   ├── store/
│   │   └── useStore.ts       # Zustand store (456 строк)
│   │
│   ├── App.tsx               # Root component
│   ├── main.tsx              # Entry point
│   └── index.css             # Global styles (Tailwind)
│
├── public/                   # Static assets
├── index.html                # HTML template
├── vite.config.ts            # Vite + security headers
├── tailwind.config.js        # Tailwind config
└── tsconfig.json             # TypeScript strict mode
```

## Ключевые компоненты

### Auth.tsx
**Путь:** `src/components/Auth.tsx`
**Назначение:** Email/password авторизация через Supabase

**Режимы:**
- Login
- Signup
- Password Reset

**Security:**
- Email regex validation
- Password length check (min 6)
- XSS prevention через sanitization

### ChatArea.tsx
**Путь:** `src/components/ChatArea.tsx`
**Назначение:** Основной интерфейс чата

**Функционал:**
- Streaming messages display
- Markdown rendering (React Markdown)
- Syntax highlighting (Prism)
- Token usage display
- Auto-scroll, auto-focus
- Copy message button

### useStore.ts
**Путь:** `src/store/useStore.ts`
**Назначение:** Централизованный state management

**State slices:**
- `user` — текущий пользователь
- `chats` — список чатов
- `messages` — сообщения текущего чата
- `settings` — API key, model, temperature, theme
- `personalities` — AI персоналии
- `ui` — sidebar, settings panel state

**Key actions:**
- `sendMessage()` — отправка + streaming ответа
- `loadChats()` / `loadMessages()` — загрузка из Supabase
- `setApiKey()` / `updateSettings()` — настройки

### OpenAI Service
**Путь:** `src/lib/openai.ts`
**Назначение:** Интеграция с OpenAI API

```typescript
class OpenAIService {
  setApiKey(key: string): void
  async *streamChat(messages, options): AsyncGenerator<StreamChunk>
  async validateApiKey(): Promise<boolean>
}
```

**Особенности:**
- Async generator для streaming
- Token usage tracking
- Error handling

## Архитектурные паттерны

### State Management: Zustand Store
- Единый глобальный store
- Actions определены внутри store
- Async операции напрямую в actions
- Нет middleware (простота)

### Service Layer Pattern
- `lib/` содержит изолированные сервисы
- Каждый сервис отвечает за один external API
- Легко тестировать и заменять

### Component Architecture
- Feature-based компоненты (Auth, Chat, Settings)
- Каждый компонент независим
- Local state для форм, Zustand для shared state

### Async Generator Pattern
```typescript
for await (const chunk of openai.streamChat(messages)) {
  // Real-time UI updates
}
```

## Data Flow

```
User Input
    ↓
ChatArea.tsx (validation, sanitization)
    ↓
useStore.sendMessage()
    ↓
┌─────────────────────────────────────┐
│  1. Save user message to Supabase   │
│  2. Call OpenAI streaming API       │
│  3. Update messages[] in real-time  │
│  4. Save assistant message          │
└─────────────────────────────────────┘
    ↓
React re-renders ChatArea
    ↓
User sees streaming response
```

## Database Schema (Supabase)

### chats
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK to auth.users |
| title | TEXT | Chat title |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update |

### messages
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| chat_id | UUID | FK to chats |
| role | TEXT | 'user' или 'assistant' |
| content | TEXT | Message content |
| token_usage | JSONB | Token counts |
| created_at | TIMESTAMP | Creation time |

### settings
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK to auth.users (unique) |
| openai_api_key | TEXT | Encrypted API key |
| model | TEXT | gpt-4o, gpt-3.5-turbo, etc |
| temperature | DECIMAL | 0.0-2.0 |
| max_tokens | INTEGER | Response length limit |
| theme | TEXT | 'light' или 'dark' |

### personalities
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK to auth.users |
| name | TEXT | Personality name |
| system_prompt | TEXT | Custom system prompt |
| has_memory | BOOLEAN | Include chat history |
| is_default | BOOLEAN | Default personality |

**Security:** Row Level Security (RLS) на всех таблицах.

## Конфигурация

### Environment Variables
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Vite Config (Security)
- Source maps disabled в production
- Console.log dropped
- Terser minification
- Security headers (CSP, X-Frame-Options, etc.)

### TypeScript
- Strict mode enabled
- No unused variables/params
- ES2020 target

## Тестирование

**Текущий статус:** Тесты отсутствуют

**План:**
- Vitest для unit тестов
- Playwright для E2E
- Testing Library для компонентов

## Деплой

**Текущий статус:** Только локальная разработка

**План:**
- Vercel для frontend
- Supabase уже в облаке
- GitHub Actions для CI/CD

---
*Обновляется при изменении архитектуры*
