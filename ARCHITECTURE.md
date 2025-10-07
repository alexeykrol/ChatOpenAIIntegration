# Project Architecture

**Project:** ChatOpenAI Integration Assistant
**Version:** 1.5
**Last Updated:** 2025-01-31

---

## 📊 Technology Stack

### Frontend
- **Framework:** React 18 + TypeScript + Vite
- **State Management:** Zustand (useStore)
- **UI/CSS:** Tailwind CSS + Lucide React icons
- **Routing:** React Router (if used)

### Backend & Infrastructure
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **File Storage:** OpenAI Files API (NOT Supabase Storage)
- **AI Integration:** OpenAI Assistants API + Embeddings API

### Key Dependencies
```json
{
  "@supabase/supabase-js": "^2.56.0",
  "openai": "^5.16.0",
  "zustand": "state management",
  "react": "^18.3.1",
  "lucide-react": "^0.344.0"
}
```

---

## 🗂️ Project Structure

```
src/
├── components/           # React components
│   ├── Personalities.tsx # Assistant management + files
│   ├── FileDropZone.tsx  # Drag & drop component
│   ├── ChatArea.tsx      # Chat interface (+ Memory Settings)
│   ├── Settings.tsx      # Settings (+ Memory Settings)
│   ├── MemorySettings.tsx # ✨ Memory summarization settings
│   └── Sidebar.tsx       # Navigation
├── lib/                  # Services and utilities
│   ├── supabase.ts       # Supabase client + types (+ Retrieval types)
│   ├── openai.ts         # OpenAI API service
│   ├── fileProcessing.ts # File processing
│   └── ragService.ts     # RAG service (legacy)
├── retrieval/ ✨         # Memory and summarization module
│   ├── types/index.ts    # Types for entire module
│   ├── index.ts          # Main RetrievalService API
│   ├── services/
│   │   └── database.ts   # SummaryDatabaseService
│   └── summarization/
│       └── index.ts      # SummarizationService + algorithm
├── pages/api/retrieval/ ✨
│   └── summarize.ts      # API endpoint for summarization
├── store/
│   └── useStore.ts       # Zustand store (+ Memory support)
└── App.tsx

supabase/
├── docs/                 # Database documentation
│   └── DATABASE_CHANGELOG.md (+ Retrieval tables)
├── scripts/              # Migrations and scripts (+ Retrieval)
│   ├── apply-retrieval-direct.mjs
│   ├── apply-personality-summarization.mjs ✨
│   └── simple-personality-migration.mjs ✨
└── migrations/           # SQL migrations
    ├── 003_add_retrieval_module.sql
    └── 004_add_personality_summarization.sql ✨

MaaS/ ✨                  # Memory as a Service (separate microservice)
├── README.md              # MaaS documentation
├── docs/                  # Specifications and plans
│   ├── MaaS.md           # Full specification
│   ├── MaaS_IMPLEMENTATION_PLAN.md
│   └── CONTEXT_OPTIMIZATION.md
├── schemas/              # Database SQL schemas
│   └── 001_initial_schema.sql
├── scripts/              # Database scripts
│   └── create_maas_tables.mjs
└── n8n/                  # n8n workflows
```

---

## 🏗️ Core Architecture Decisions

### 1. File Architecture: OpenAI Files API

**Decision:** Files stored in OpenAI, NOT in our database
**Reasoning:**
- ✅ Native integration with Assistants API
- ✅ Automatic vectorization and search
- ✅ Less infrastructure complexity
- ✅ Reproduces Custom GPT logic

**Alternatives considered:**
- ❌ Supabase Storage + custom RAG system
- ❌ Local storage + vectorization

**Data structure:**
```typescript
// Database stores only metadata:
files: PersonalityFile[] = [
  {
    openai_file_id: "file-abc123", // ID in OpenAI
    file_name: "document.pdf",
    file_size: 1024000,
    status: "ready" | "processing" | "error"
  }
]
```

### 2. State Management: Zustand

**Decision:** Zustand instead of Redux/Context API
**Reasoning:**
- ✅ Simple to use
- ✅ TypeScript support
- ✅ Minimal boilerplate
- ✅ Excellent performance

### 3. Database: JSONB vs Relational

**Decision:** JSONB for files, relational structure for core data
**Reasoning:**
- ✅ `personalities.files` as JSONB array - flexibility
- ✅ PostgreSQL has excellent JSONB support
- ✅ Fewer JOINs when reading data
- ✅ Atomic file array updates

---

## 🔧 Key Services & Components

### OpenAI Service (src/lib/openai.ts)
**Purpose:** Interaction with OpenAI API
**Key methods:**
```typescript
- createAssistant() → creates assistant with name transliteration
- updateAssistant() → updates prompt + file_instruction
- uploadFileToOpenAI() → uploads file to OpenAI Files API ✅
- deleteFileFromOpenAI() → deletes file from OpenAI ✅
- listFiles() → lists all assistant files ✅
- runAssistant() → runs chat with optimized polling
- checkRun() → checks status without duplication
```

**Architectural features:**
- Transliteration Cyrillic → Latin for OpenAI
- System prompt = base_prompt + file_instruction
- Polling with minimal API calls

### Zustand Store (src/store/useStore.ts)
**Purpose:** Central application state
**Structure:**
```typescript
AppState {
  // Auth
  user: User | null

  // Chats
  chats: Chat[]
  messages: Message[]
  currentChatId: string | null

  // Personalities
  personalities: Personality[]
  activePersonality: Personality | null

  // Services
  openaiService: OpenAIService
}
```

**Key methods:**
- `sendMessage()` → sends message with optimized polling
- `updatePersonality()` → updates + syncs with OpenAI
- `uploadPersonalityFile()` → coordinates file upload ✅
- `deletePersonalityFile()` → deletes file and updates assistant ✅

### FileDropZone Component (src/components/FileDropZone.tsx) ✨
**Purpose:** Reusable drag & drop component
**Features:**
- Full drag & drop functionality
- Visual state indicators (hover, active, error)
- Compact mode for different UI contexts
- Built-in file validation
- TypeScript typed props

### Database Layer (src/lib/supabase.ts)
**Purpose:** Typed access to Supabase
**Features:**
- Strict TypeScript types for all tables
- PersonalityFile interface for JSONB structure
- RLS (Row Level Security) policies

---

## 📡 Data Flow & Integration Patterns

### 1. Create/Update Personality
```
UI Form → useStore.updatePersonality() →
├── Update Supabase DB
├── openaiService.updateAssistant() (system prompt)
└── UI State Update
```

### 2. Chat Message Flow
```
User Input → useStore.sendMessage() →
├── Add to local messages[]
├── Save to Supabase
├── openaiService.addMessage() → OpenAI Thread
├── openaiService.runAssistant() → Start run
├── Optimized polling checkRun()
├── Get response from Thread
└── Update UI + Save to DB
```

### 3. File Upload Flow
```
File Selection → uploadPersonalityFile() →
├── openaiService.uploadFileToOpenAI() → file_id
├── Update personality.files[] in DB
├── openaiService.updateAssistant() → update prompt
└── UI refresh
```

### 4. Memory Summarization Flow (Retrieval Module) ✨
```
Chat Messages Accumulate →
├── Database trigger checks message count threshold
├── Calls /api/retrieval/summarize endpoint
├── RetrievalService processes messages
│   ├── SummarizationService generates summary via LLM
│   ├── Merges with previous summaries
│   └── Deduplicates facts
├── Stores summary in summaries table
└── Updates memory_settings last_summary_at
```

---

## 🎯 Development Standards

### Code Organization
- **1 component = 1 file**
- **Services in lib/** for reusability
- **TypeScript strict** - no any (except exceptions)
- **Naming:** camelCase for variables, PascalCase for components

### Database Patterns
- **UUID** for all Primary Keys
- **JSONB** for complex data structures
- **RLS** for row-level security
- **Migrations** via scripts with logging

### Error Handling
- **Try/catch** in async functions
- **User-friendly** error messages
- **Console logging** for debugging
- **Fallback states** in UI

### Performance Optimizations
- **Optimized polling** for OpenAI API
- **Zustand selective subscriptions**
- **GIN indexes** for JSONB queries
- **Minimal re-renders** in React

---

## 🧩 Module Architecture

### Retrieval Module (v1.4) ✨
**Purpose:** Memory summarization and context optimization

**Components:**
- `RetrievalService` - Main API for summarization operations
- `SummarizationService` - LLM-based summary generation
- `SummaryDatabaseService` - Database operations for summaries

**Database Tables:**
- `memory_settings` - Per-personality summarization config
- `summary_prompts` - LLM prompt templates for summarization
- `summaries` - Generated summaries storage
- `summary_events` - Audit log of summarization events

**Integration:**
- Fully encapsulated module (no changes to core code)
- API endpoint: `/api/retrieval/summarize`
- Database triggers for automatic summarization
- UI toggle in Memory Settings

**Algorithm:**
- Incremental summarization (chunks of messages)
- Previous summary context for continuity
- LLM-based fact extraction and merging
- Deduplication and consolidation

### MaaS Module (v1.5) ✨
**Purpose:** Memory as a Service - independent microservice

**Architecture:**
- Separate Supabase project with own database
- Communication via webhook/API (not direct integration)
- n8n workflow for pipeline prototyping
- Project URL: https://litybpjfpjphvsczslrt.supabase.co

**Database Schema (9 tables):**
- `projects` - MaaS projects
- `facts` - Extracted facts from conversations
- `decisions` - Decisions made in projects
- `sources` - Source tracking
- `relationships` - Entity relationships
- `context_windows` - Optimized context delivery
- `maas_settings` - Service configuration
- `processing_queue` - Async processing queue
- `audit_log` - Change tracking

**Workflow:**
```
Main App Chat → Webhook → n8n Pipeline →
├── MaaS API receives message data
├── Fact extraction and processing
├── Storage in MaaS database
└── Context optimization and delivery
```

---

## 🔄 Evolution & Migration Strategy

### Approach to Changes
1. **Document decision** in this file
2. **Database changes** → DATABASE_CHANGELOG.md
3. **Backward compatibility** when possible
4. **Feature flags** for experimental functionality

### Migration Pattern
```
Planning → Implementation → Testing → Documentation → Deployment
    ↓           ↓              ↓           ↓            ↓
ARCHITECTURE  Code+Tests    Manual QA   Update docs   Git push
```

---

## 📚 Related Documentation

- **BACKLOG.md** - Current implementation status and roadmap
- **AGENTS.md** - AI assistant working instructions
- **WORKFLOW.md** - Development processes and sprint workflow
- **DATABASE_CHANGELOG.md** - Database schema evolution
- **README.md** - User-facing project information

---

*This document maintained in current state for effective development*
*Last updated: 2025-01-31*
