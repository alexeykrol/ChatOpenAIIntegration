# AI Agent Instructions

**Project:** ChatOpenAI Integration Assistant
**Purpose:** Meta-instructions for effective AI-assisted development
**Created:** 2025-01-31
**Last Updated:** 2025-01-31

> **Note:** This file is optimized for AI assistants (Claude, Cursor, Copilot, etc.) working with this codebase.

---

## 🎯 Quick Start for AI Agents

### Required Reading (in order):
1. **ARCHITECTURE.md** - System architecture and technical decisions
2. **BACKLOG.md** - Current implementation status and roadmap
3. **supabase/docs/DATABASE_CHANGELOG.md** - Database structure history
4. **README.md** - User-facing project information

### ⚠️ SINGLE SOURCE OF TRUTH:
**BACKLOG.md** is the ONLY authoritative source for:
- Current implementation status
- Feature priorities
- Development roadmap

All other files (TODOS_DEPRECATED.md, ORIGINAL_REQUIREMENTS.md) are for reference only.

### Key Files Quick Reference:
```bash
# Architecture & Planning
ARCHITECTURE.md                # System design and patterns
BACKLOG.md                     # Implementation status (SINGLE SOURCE OF TRUTH)
WORKFLOW.md                    # Development processes

# Core Application
src/store/useStore.ts          # Zustand central state
src/lib/openai.ts              # OpenAI API service
src/lib/supabase.ts            # Database types + client
src/components/Personalities.tsx # Assistant management UI

# Documentation
README.md                      # User-facing documentation
supabase/docs/DATABASE_CHANGELOG.md # DB change history

# Deprecated (reference only)
TODOS_DEPRECATED.md           # Old roadmap
ORIGINAL_REQUIREMENTS.md      # Initial requirements
```

---

## 📚 Technology Stack

### Frontend
- **Framework:** React 18 + TypeScript (strict mode)
- **Build Tool:** Vite
- **State Management:** Zustand
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Code Style:**
  - TypeScript strict mode (no `any` except justified exceptions)
  - Prettier for formatting
  - ESLint for linting
  - 1 component = 1 file

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
  "react": "^18.3.1"
}
```

---

## 🚫 NEVER DO

### Code & Architecture
- ❌ **Create new database tables** without analyzing existing schema (see DATABASE_CHANGELOG.md)
- ❌ **Duplicate OpenAI API calls** (especially in polling loops)
- ❌ **Update database structure** without migration script
- ❌ **Use Supabase Storage for files** (we use OpenAI Files API)
- ❌ **Forget transliteration** for OpenAI (Cyrillic → Latin conversion required)
- ❌ **Ignore RLS policies** in Supabase
- ❌ **Use `any` type** without explicit justification
- ❌ **Create multiple components in one file**

### Process & Documentation
- ❌ **Skip documentation updates** after sprint completion
- ❌ **Modify BACKLOG.md** without completing actual implementation
- ❌ **Create commits** without meaningful messages
- ❌ **Update dependencies** without testing
- ❌ **Push to main/master** without review (if team workflow requires it)

### Legal & Security
- ❌ **Expose API keys** in code or documentation
- ❌ **Commit `.env.local`** to repository
- ❌ **Skip environment variable validation**
- ❌ **Create insecure database queries** (always use parameterized queries)

---

## ✅ ALWAYS DO

### Before Making Changes
- ✅ **Read ARCHITECTURE.md** for architectural decisions
- ✅ **Check BACKLOG.md** for current status
- ✅ **Review DATABASE_CHANGELOG.md** before DB changes
- ✅ **Test in development** environment first

### During Development
- ✅ **Use existing patterns** (Zustand store, JSONB for files, etc.)
- ✅ **Follow TypeScript strict mode** (type everything properly)
- ✅ **Write migration scripts** for database changes
- ✅ **Update TypeScript types** after DB schema changes
- ✅ **Test thoroughly** before marking tasks as complete
- ✅ **Use transliteration** for Cyrillic names in OpenAI

### After Completion
- ✅ **Update BACKLOG.md** with implementation status
- ✅ **Update DATABASE_CHANGELOG.md** if DB changed
- ✅ **Update AGENTS.md** if new patterns/rules discovered
- ✅ **Update README.md** if user-facing changes
- ✅ **Create meaningful git commit** (see WORKFLOW.md for template)
- ✅ **Mark all TodoWrite tasks** as completed

---

## 🔧 Standard Workflows

### Database Changes
```
1. Analysis → Read DATABASE_CHANGELOG.md
2. Planning → Create migration script in supabase/migrations/
3. Testing → node supabase/scripts/apply-migration.mjs
4. Type Update → Update Database interface in src/lib/supabase.ts
5. Documentation → Update DATABASE_CHANGELOG.md
6. Code → Implement feature using new schema
7. Sprint Completion → Update BACKLOG.md and AGENTS.md
```

### OpenAI API Integration
```
1. Check transliteration requirements (Cyrillic names?)
2. Avoid polling duplication (use lastRunCheck pattern)
3. Use optimized checkRun in useStore
4. Remember: Files in OpenAI, metadata in database
5. System prompt = base_prompt + file_instruction
```

### New Feature Development
```
1. Read ARCHITECTURE.md (understand patterns)
2. Check BACKLOG.md (current status)
3. Plan with TodoWrite tool
4. Implement following existing patterns
5. Test thoroughly
6. Update documentation (BACKLOG.md, AGENTS.md, README.md)
7. Create sprint completion commit
```

### Bug Fix
```
1. Diagnose root cause
2. Check if similar issue exists in AGENTS.md "Common Issues"
3. Fix following existing patterns
4. Test fix
5. Add to "Common Issues" section if applicable
6. Update version in README.md if necessary
```

---

## 🏗️ Architectural Patterns

### File Storage Architecture
**Decision:** Files stored in OpenAI Files API, NOT in our database
**Reason:**
- Native integration with Assistants API
- Automatic vectorization and search
- Less infrastructure complexity
- Reproduces Custom GPT logic

**Data Structure:**
```typescript
// Database stores only metadata (JSONB array):
files: PersonalityFile[] = [{
  openai_file_id: "file-abc123",
  file_name: "document.pdf",
  file_size: 1024000,
  status: "ready" | "processing" | "error",
  uploaded_at: "2025-01-31T10:00:00Z"
}]
```

### State Management Pattern
**Decision:** Zustand instead of Redux/Context API
**Reason:**
- Simple API
- Excellent TypeScript support
- Minimal boilerplate
- Great performance with selective subscriptions

### Database Design Patterns
- **Primary Keys:** Always UUID
- **Complex Structures:** JSONB with GIN indexes
- **File Metadata:** JSONB arrays for flexibility
- **Security:** RLS (Row Level Security) policies on all tables
- **Updates:** Atomic JSONB array updates

---

## 🐛 Common Issues & Solutions

### Issue: Duplicate OpenAI API Calls
**Symptom:** Multiple "Run status" messages in console
**Root Cause:** Polling creates new API calls instead of reusing results
**Solution:** Use `lastRunCheck` pattern in `useStore.sendMessage()`
**File:** `src/store/useStore.ts:sendMessage()`

### Issue: Cyrillic Names in OpenAI
**Symptom:** OpenAI rejects assistant creation/update with Cyrillic names
**Root Cause:** OpenAI API doesn't accept Cyrillic characters
**Solution:** Use `transliterate()` function in createAssistant/updateAssistant
**File:** `src/lib/openai.ts`

### Issue: Database Migration Failures
**Symptom:** Transaction failures during migration
**Root Cause:** BEGIN/COMMIT blocks in rpc('exec_sql') cause issues
**Solution:** Split into separate SQL commands without transaction wrappers
**Pattern:** Don't use BEGIN/COMMIT in rpc('exec_sql')

### Issue: TypeScript Type Mismatches
**Symptom:** Type errors after database changes
**Root Cause:** Database interface not updated
**Solution:** Update `Database` interface in `src/lib/supabase.ts`
**Note:** Use `uploaded_at::text` for timestamp casting in queries

---

## 📋 Task Checklists

### Adding New Field to `personalities` Table
- [ ] Create migration script in `supabase/migrations/`
- [ ] Test in development: `node supabase/scripts/apply-migration.mjs`
- [ ] Update `Database` interface in `src/lib/supabase.ts`
- [ ] Update `PersonalityFile` interface if applicable
- [ ] Update Zustand store methods in `src/store/useStore.ts`
- [ ] Update UI components
- [ ] Update `DATABASE_CHANGELOG.md`
- [ ] Update `BACKLOG.md` status
- [ ] Create sprint completion commit

### Implementing New OpenAI API Feature
- [ ] Add method to `OpenAIService` class in `src/lib/openai.ts`
- [ ] Handle transliteration if names involved
- [ ] Add store action in `src/store/useStore.ts`
- [ ] Update UI components
- [ ] Test for polling duplication
- [ ] Update `BACKLOG.md` status
- [ ] Create sprint completion commit

### File Upload/Management Feature
- [ ] Remember: Files go to OpenAI, metadata to database
- [ ] Use `PersonalityFile` interface for typing
- [ ] Update `files` JSONB array in database
- [ ] Sync with OpenAI assistant using `updateAssistant()`
- [ ] Respect 20 files per personality constraint
- [ ] Update UI with drag & drop support
- [ ] Test upload/delete flows
- [ ] Update documentation

---

## 🔍 Debugging Quick Reference

### Database Issues
```sql
-- Check personalities table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'personalities';

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'personalities';

-- Check RLS policies
SELECT * FROM pg_policies
WHERE tablename = 'personalities';
```

### OpenAI API Issues
```javascript
// Check API key in browser console
localStorage.getItem('openai_api_key')

// Test transliteration
console.log(transliterate('Тестовый Ассистент'))
// Expected: "Testovyy Assistant"

// Check assistant configuration
console.log(openaiService.client.beta.assistants.retrieve(assistant_id))
```

### State Management Issues
```javascript
// Zustand store debug
console.log(useStore.getState())

// Check specific state slice
console.log(useStore.getState().personalities)

// Monitor state changes
useStore.subscribe(console.log)
```

---

## 📊 Performance Guidelines

### OpenAI API Optimization
- **Polling interval:** Use optimized pattern in useStore
- **Duplicate calls:** MUST be zero (check console logs)
- **Error handling:** Graceful fallbacks with user feedback
- **Rate limits:** Implement exponential backoff

### Database Performance
- **GIN indexes:** Required for JSONB queries on `files` column
- **RLS policies:** Active on all tables for security
- **Connection pooling:** Managed by Supabase (max 50 concurrent)
- **Query optimization:** Use selective columns, avoid SELECT *

### Frontend Performance
- **Re-renders:** Minimize using Zustand selective subscriptions
- **Component patterns:** Small, focused components (1 file = 1 component)
- **TypeScript:** Strict mode for compile-time optimization
- **Bundle size:** Monitor with `npm run build` analysis

---

## 🚀 Code Templates

### New OpenAI Service Method
```typescript
async newMethod(param: string): Promise<ResultType> {
  if (!this.client) {
    throw new Error('OpenAI client not initialized');
  }

  try {
    const result = await this.client.someAPI({
      name: transliterate(param), // If param contains names
      // other parameters
    });
    return result;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error(`Failed to execute newMethod: ${error.message}`);
  }
}
```

### New Zustand Store Action
```typescript
newAction: async (param: string) => {
  const { get, set } = useStore;

  try {
    set({ loading: true, error: null });

    // Update database
    const { data, error } = await supabase
      .from('table')
      .update({ field: param })
      .select();

    if (error) throw error;

    // Sync with OpenAI if needed
    await get().openaiService.syncMethod();

    set({
      data: data,
      loading: false
    });
  } catch (error) {
    console.error('Action failed:', error);
    set({
      loading: false,
      error: error.message
    });
  }
}
```

### Database Migration Script
```javascript
// supabase/scripts/apply-new-migration.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function applyMigration() {
  const sql = readFileSync(
    join(__dirname, '../migrations/XXX_migration_name.sql'),
    'utf-8'
  );

  console.log('Applying migration...');
  const { data, error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }

  console.log('Migration successful:', data);
}

applyMigration();
```

---

## 📝 Sprint Workflow

See **WORKFLOW.md** for detailed sprint processes, including:
- Sprint structure and phases
- Completion checklists
- Commit message templates
- Documentation update requirements

**Key Rule:** NEVER end a sprint without updating all relevant documentation files.

---

## 🔄 Version History

- **2025-01-31:** Created from CLAUDE.md, restructured for universal AI agent use
- Previous updates tracked in CLAUDE.md (now deprecated)

---

*This file should be updated after every sprint completion*
*Goal: Maintain living documentation for effective AI-assisted development*
*Compatible with: Claude Code, Cursor, GitHub Copilot, and other AI coding assistants*
