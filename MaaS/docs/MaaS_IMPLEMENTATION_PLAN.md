# MaaS Implementation Plan - От простого к сложному

**Проект:** ChatOpenAI Integration Assistant - Memory as a Service
**Подход:** Итеративная разработка через n8n → код
**Принцип:** Едим слона по частям
**Дата:** 2025-01-31

---

## 🎯 Философия подхода

Строим MaaS итеративно, начиная с минимального рабочего pipeline:
1. **Прототипируем в n8n** - быстро, визуально, прозрачно
2. **Тестируем на реальных данных** - находим проблемные точки
3. **Оптимизируем промпты и логику** - улучшаем качество
4. **Переносим в код** - когда pipeline стабилен

---

## 📊 Этапы реализации

### Phase 0: Минимальный Pipeline (MVP)
**Цель:** Простейший проход запрос → контекст → ответ

#### Шаг 0.1: База данных - минимум
```sql
-- Только одна таблица для начала
CREATE TABLE maas_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id),
  user_query TEXT,
  context_bundle JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Шаг 0.2: n8n - простейший webhook
```
1. Webhook Trigger
   ↓
2. HTTP Request to Supabase (get last 10 messages)
   ↓
3. OpenAI Chat (простая саммаризация)
   ↓
4. Compose Context (конкатенация)
   ↓
5. Webhook Response
```

#### Шаг 0.3: Интеграция в приложение
```typescript
// В useStore.ts - добавляем вызов webhook
const contextBundle = await fetch('n8n-webhook-url', {
  body: JSON.stringify({ query, chatId })
}).then(r => r.json());

// Используем context вместо прямого запроса
```

**Checkpoint:** Работает базовый pipeline через n8n ✓

---

### Phase 1: Добавляем сущность Project
**Цель:** Ввести концепцию проекта с миссией и целями

#### Шаг 1.1: Расширяем БД
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  mission TEXT,
  goals TEXT[],
  constraints TEXT[],
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Связываем чаты с проектами
ALTER TABLE chats ADD COLUMN project_id UUID REFERENCES projects(id);
```

#### Шаг 1.2: n8n - добавляем NormalizeRequest
```
1. Webhook Trigger
   ↓
2. Function: Determine Project (пока просто default)
   ↓
3. DB: Get Project Mission & Goals
   ↓
4. Previous pipeline...
```

#### Шаг 1.3: Промпт для контекста с миссией
```
System: You are working on project with:
Mission: {project.mission}
Goals: {project.goals}
Constraints: {project.constraints}

Recent context: {summary}
User query: {query}
```

**Checkpoint:** Контекст учитывает проект ✓

---

### Phase 2: Извлечение и хранение фактов
**Цель:** Начать извлекать факты из диалогов

#### Шаг 2.1: Таблица фактов
```sql
CREATE TABLE facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  chat_id UUID REFERENCES chats(id),
  subject TEXT NOT NULL,
  value JSONB,
  level TEXT CHECK (level IN ('fact', 'hypothesis', 'interpretation')),
  source_message_id UUID REFERENCES messages(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_facts_project ON facts(project_id);
CREATE INDEX idx_facts_subject ON facts USING GIN(subject gin_trgm_ops);
```

#### Шаг 2.2: n8n - добавляем Fact Extractor
```
After getting assistant response:
   ↓
6. LLM: Extract Facts
   Prompt: "Extract facts from this conversation:
           Return JSON: {facts: [{subject, value, level}]}"
   ↓
7. DB: Save Facts
```

#### Шаг 2.3: Использование фактов в контексте
```
BuildSnapshot теперь включает:
- Recent facts from project
- Relevant facts by subject
```

**Checkpoint:** Факты извлекаются и используются ✓

---

### Phase 3: Саммаризация с сохранением деталей
**Цель:** Умная компрессия истории

#### Шаг 3.1: Thread summaries таблица
```sql
CREATE TABLE thread_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id),
  summary_text TEXT,
  key_facts JSONB, -- [{subject, value}]
  decisions JSONB, -- [{title, description, decided_at}]
  open_questions TEXT[],
  message_count INTEGER,
  token_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Шаг 3.2: n8n - инкрементальная саммаризация
```
Каждые N сообщений:
1. Check if needs summarization (token count)
2. LLM: Summarize Thread
   - Preserve key facts
   - Note decisions
   - Track open questions
3. Save summary
4. Mark messages as summarized
```

#### Шаг 3.3: Иерархический контекст
```
BuildSnapshot:
- Level 1: Project mission (always)
- Level 2: Thread summaries (compressed)
- Level 3: Recent messages (full)
- Level 4: Relevant facts (filtered)
```

**Checkpoint:** История сжимается без потери важного ✓

---

### Phase 4: Добавляем Decisions (решения)
**Цель:** Отслеживать принятые решения

#### Шаг 4.1: Таблица решений
```sql
CREATE TABLE decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  title TEXT NOT NULL,
  description TEXT,
  rationale TEXT,
  decided_at TIMESTAMPTZ,
  source_message_id UUID REFERENCES messages(id),
  status TEXT DEFAULT 'active', -- active, superseded, revoked
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Шаг 4.2: Decision Extractor в n8n
```
LLM prompt:
"Identify decisions made in this conversation.
A decision is a choice that affects future actions.
Return: {decisions: [{title, description, rationale}]}"
```

**Checkpoint:** Решения фиксируются ✓

---

### Phase 5: Связи между сущностями (Links)
**Цель:** Понимать как связаны факты и решения

#### Шаг 5.1: Таблица связей
```sql
CREATE TABLE links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_entity_type TEXT, -- 'fact', 'decision', 'chat'
  from_entity_id UUID,
  to_entity_type TEXT,
  to_entity_id UUID,
  link_kind TEXT, -- 'causes', 'contradicts', 'refines', 'depends'
  weight DECIMAL(3,2) DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Шаг 5.2: Link Detector
```
После извлечения фактов/решений:
- Найти противоречия
- Найти зависимости
- Найти уточнения
```

**Checkpoint:** Граф знаний формируется ✓

---

### Phase 6: Атрибуция источников
**Цель:** Всегда знать откуда пришла информация

#### Шаг 6.1: Таблица источников
```sql
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT, -- 'message', 'document', 'url'
  ref_id TEXT,
  quote TEXT,
  author TEXT,
  date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Связываем факты с источниками
ALTER TABLE facts ADD COLUMN source_id UUID REFERENCES sources(id);
```

#### Шаг 6.2: Strict attribution в промптах
```
"ALWAYS specify source for each fact:
- message_id if from conversation
- 'hypothesis' if inferred
- 'user_stated' if directly stated"
```

**Checkpoint:** Полная прослеживаемость ✓

---

### Phase 7: RAG интеграция (опционально)
**Цель:** Подключить внешние knowledge bases

#### Шаг 7.1: Knowledge chunks таблица
```sql
CREATE TABLE knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  content TEXT,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Шаг 7.2: Vector search в n8n
```
1. Generate embedding for query
2. Vector similarity search
3. Add top-k chunks to context
```

**Checkpoint:** Внешние знания доступны ✓

---

### Phase 8: Оптимизация и метрики
**Цель:** Понять что работает, что нет

#### Шаг 8.1: Таблица метрик
```sql
CREATE TABLE maas_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_run_id UUID,
  stage TEXT,
  latency_ms INTEGER,
  tokens_used INTEGER,
  facts_extracted INTEGER,
  decisions_found INTEGER,
  cache_hit BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Шаг 8.2: Измерения в n8n
```
Каждый узел логирует:
- Время выполнения
- Использованные токены
- Количество извлеченных сущностей
```

**Checkpoint:** Метрики собираются ✓

---

### Phase 9: Кеширование и производительность
**Цель:** Ускорить pipeline

#### Шаг 9.1: Snapshot cache
```sql
CREATE TABLE snapshot_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE,
  snapshot JSONB,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Шаг 9.2: Умное кеширование
- Кешировать project mission (1 час)
- Кешировать thread summaries (15 мин)
- Кешировать facts по subject (5 мин)

**Checkpoint:** Pipeline быстрый ✓

---

### Phase 10: Перенос в код
**Цель:** Мигрировать стабильный pipeline из n8n в TypeScript

#### Шаг 10.1: Создать MaaS service
```typescript
class MaaSService {
  async normalizeRequest(query: string) {}
  async buildSnapshot(projectId: string, chatId: string) {}
  async composeContext(snapshot: Snapshot, budget: number) {}
  // ... все функции из n8n
}
```

#### Шаг 10.2: Интегрировать в useStore
```typescript
const maas = new MaaSService();
const context = await maas.processQuery(query, chatId);
```

**Checkpoint:** MaaS работает нативно ✓

---

## 🔍 Точки отладки и оптимизации

### После каждой фазы проверяем:
1. **Качество извлечения** - правильно ли извлекаются факты/решения?
2. **Полнота контекста** - не теряем ли важную информацию?
3. **Размер контекста** - укладываемся ли в токены?
4. **Скорость** - где bottlenecks?
5. **Стоимость** - сколько токенов тратим?

### Инструменты отладки в n8n:
- Логирование каждого шага
- Просмотр промежуточных результатов
- A/B тестирование промптов
- Версионирование workflows

---

## 📈 Метрики успеха

### Количественные:
- Сжатие контекста: 10:1 без потери смысла
- Точность извлечения фактов: >90%
- Latency pipeline: <3 сек
- Стоимость на запрос: <$0.01

### Качественные:
- Ассистент "помнит" важные решения
- Контекст релевантен запросу
- Атрибуция прозрачна
- Pipeline понятен студентам

---

## 🚀 Начинаем!

### Первые 3 действия:
1. **Создать webhook в n8n** для приема запросов
2. **Создать таблицу maas_snapshots** в Supabase
3. **Модифицировать sendMessage()** для вызова webhook

### Проверка MVP:
- [ ] Webhook принимает запрос
- [ ] n8n получает последние сообщения
- [ ] Создается простой контекст
- [ ] Контекст возвращается в приложение
- [ ] Ассистент использует контекст

---

## 📝 Заметки

### Почему этот подход работает:
1. **Итеративность** - каждый шаг приносит ценность
2. **Прозрачность** - видим что происходит
3. **Гибкость** - легко менять и экспериментировать
4. **Образование** - студенты видят архитектуру

### Параллели с Claude/ChatGPT:
- Они тоже используют pipeline подход
- Контекст формируется динамически
- Факты и решения отслеживаются
- История компрессируется умно

### Риски и митигация:
- **Сложность промптов** → начинаем с простых
- **Latency** → кеширование критичных частей
- **Стоимость** → оптимизация токенов
- **Потеря информации** → инкрементальность

---

*Этот план - живой документ. Обновляется по мере прохождения фаз.*
*Следующий шаг: Phase 0 - создание MVP pipeline в n8n*