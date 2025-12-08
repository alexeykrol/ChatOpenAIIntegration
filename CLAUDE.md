# DEPRECATED: See AGENTS.md instead

**⚠️ This file is DEPRECATED as of v1.6 (2025-01-31)**

## 🔄 Migration Notice

This file has been replaced by a new documentation structure:

- **[AGENTS.md](AGENTS.md)** - Universal AI agent instructions (replaces this file)
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture and technical decisions
- **[BACKLOG.md](BACKLOG.md)** - Implementation status and roadmap (SINGLE SOURCE OF TRUTH)
- **[WORKFLOW.md](WORKFLOW.md)** - Development workflows and sprint processes

### Why the change?
- **Universal compatibility:** New structure works with Claude Code, Cursor, Copilot, and other AI assistants
- **Separation of concerns:** Architecture, backlog, and workflow are now separate for clarity
- **Better discoverability:** Each file has a clear, specific purpose
- **Industry standard:** Follows de-facto best practices for AI-assisted development

### Quick Migration Guide
- Old: CLAUDE.md → New: AGENTS.md (working instructions)
- Old: PROJECT_ARCHITECTURE.md → New: ARCHITECTURE.md + BACKLOG.md (split)
- New: WORKFLOW.md (sprint processes, previously embedded in CLAUDE.md)

---

**Please refer to [AGENTS.md](AGENTS.md) for all development instructions.**

---

# Original Content (for reference only)

> **Note:** Content below is preserved for historical reference but should not be used.
> All information has been migrated to the new documentation structure.

---

# Claude Code Working Instructions

**Проект:** ChatOpenAI Integration Assistant
**Цель:** Мета-инструкции для эффективной работы с проектом
**Дата создания:** 2025-01-31
**Статус:** DEPRECATED - см. AGENTS.md

---

## 🎯 Первые шаги при работе с проектом

### Обязательно прочитать перед любыми изменениями:
1. **ARCHITECTURE.md** - System architecture and technical decisions
2. **BACKLOG.md** - 🎯 ЕДИНЫЙ БЭКЛОГ (SINGLE SOURCE OF TRUTH)
3. **AGENTS.md** - AI agent working instructions
4. **WORKFLOW.md** - Sprint processes and workflows
5. **supabase/docs/DATABASE_CHANGELOG.md** - текущая структура БД
6. **README.md** - основная информация о проекте

### ⚠️ ЕДИНЫЙ ИСТОЧНИК ИСТИНЫ ДЛЯ БЭКЛОГА:
**ТОЛЬКО BACKLOG.md**
- Все остальные файлы (TODOS_DEPRECATED.md, ORIGINAL_REQUIREMENTS.md) только для справки
- При конфликтах - BACKLOG.md имеет приоритет

### Быстрая ориентация:
```bash
# Структура ключевых файлов
AGENTS.md                      # 🤖 AI agent instructions
ARCHITECTURE.md                # 🏗️ System architecture
BACKLOG.md                     # 🎯 ЕДИНЫЙ БЭКЛОГ (SINGLE SOURCE OF TRUTH)
WORKFLOW.md                    # 🔄 Sprint processes
src/store/useStore.ts          # Центральное состояние Zustand
src/lib/openai.ts              # OpenAI API service
src/lib/supabase.ts            # Типы БД + Supabase client
src/components/Personalities.tsx # UI управления ассистентами

# Справочные файлы (не бэклог!)
TODOS_DEPRECATED.md           # Устаревший roadmap (только для справки)
ORIGINAL_REQUIREMENTS.md      # Первоначальное ТЗ (только для справки)
CLAUDE.md (this file)         # DEPRECATED - см. AGENTS.md
PROJECT_ARCHITECTURE.md        # DEPRECATED - см. ARCHITECTURE.md + BACKLOG.md
```

---

## ⚠️ Критические правила работы

### 🚫 НИКОГДА НЕ ДЕЛАТЬ:
- **Создавать новые таблицы** без анализа существующей схемы
- **Дублировать API вызовы** OpenAI (особенно в polling)
- **Обновлять БД структуру** без миграционного скрипта
- **Забывать транслитерацию** для OpenAI (кириллица → латиница)
- **Игнорировать RLS политики** в Supabase

### ✅ ВСЕГДА ДЕЛАТЬ:
- **Читать PROJECT_ARCHITECTURE.md** перед архитектурными изменениями
- **Тестировать миграции** в dev окружении
- **Обновлять TypeScript типы** после изменений БД
- **Использовать существующие паттерны** (Zustand store, JSONB для файлов)
- **Документировать изменения** в DATABASE_CHANGELOG.md

---

## 🔧 Рабочие процедуры

### Изменения в базе данных:
```
1. Анализ → читаем DATABASE_CHANGELOG.md
2. План → создаем миграционный скрипт  
3. Тестирование → node apply-migration.mjs
4. Обновление типов → src/lib/supabase.ts
5. Документация → DATABASE_CHANGELOG.md
```

### Работа с OpenAI API:
```
1. Всегда проверяй транслитерацию имен
2. Избегай дублирования polling вызовов
3. Используй оптимизированный checkRun в useStore
4. Помни: файлы в OpenAI, метаданные в БД
```

### Архитектурные решения:
```
1. Файлы → OpenAI Files API (НЕ Supabase Storage)
2. Состояние → Zustand (НЕ Redux/Context)  
3. Файловые метаданные → JSONB массив в personalities.files
4. Множественные файлы → PersonalityFile[] интерфейс
```

---

## 🏗️ Архитектурные принципы

### OpenAI Integration:
- **Assistant создание:** обязательная транслитерация имени
- **Polling optimization:** reuse lastRunCheck результата
- **Files API:** используем OpenAI, не свою векторизацию
- **System prompt:** base_prompt + file_instruction

### Database Design:
- **Primary Keys:** всегда UUID
- **File storage:** JSONB массивы с GIN индексами
- **Constraints:** максимум 20 файлов на personality
- **RLS:** строгие политики доступа

### State Management:
- **Zustand patterns:** selective subscriptions  
- **Service injection:** openaiService в store
- **Error handling:** graceful fallbacks в UI

---

## 🐛 Частые проблемы и решения

### Дублирование API вызовов:
**Проблема:** Множественные "Run status" в консоли  
**Решение:** Использовать lastRunCheck в useStore.sendMessage()  
**Файл:** `src/store/useStore.ts:sendMessage()`

### Кириллические имена в OpenAI:
**Проблема:** OpenAI не принимает кириллицу в именах  
**Решение:** Транслитерация в createAssistant/updateAssistant  
**Файл:** `src/lib/openai.ts`

### Миграции БД:
**Проблема:** Failing transactions  
**Решение:** Разбивать на отдельные SQL команды  
**Паттерн:** Не использовать BEGIN/COMMIT в rpc('exec_sql')

### Типы TypeScript:
**Проблема:** Type mismatches после изменений БД  
**Решение:** Обновляй Database interface в supabase.ts  
**Особенность:** uploaded_at::text для timestamp кастинга

---

## 📋 Чеклисты для типовых задач

### Добавление нового поля в personalities:
- [ ] Создать миграционный скрипт
- [ ] Протестировать в dev
- [ ] Обновить Database interface
- [ ] Обновить PersonalityFile interface (если нужно)
- [ ] Обновить store методы
- [ ] Обновить UI компоненты
- [ ] Документировать в DATABASE_CHANGELOG.md

### Новая функция OpenAI API:
- [ ] Добавить метод в OpenAIService
- [ ] Обработать транслитерацию (если имена)
- [ ] Добавить в store action
- [ ] Обновить UI
- [ ] Протестировать избежание дублирования

### Работа с файлами:
- [ ] Помнить: файлы в OpenAI, метаданные в БД
- [ ] Использовать PersonalityFile interface
- [ ] Обновлять files JSONB массив
- [ ] Синхронизировать с OpenAI assistant
- [ ] Проверять constraint на 20 файлов

---

## 🔍 Быстрая диагностика

### При проблемах с БД:
```sql
-- Проверить структуру personalities
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'personalities';

-- Проверить индексы
SELECT indexname, indexdef FROM pg_indexes 
WHERE tablename = 'personalities';
```

### При проблемах с OpenAI:
```javascript
// Проверить API key в браузере
localStorage.getItem('openai_api_key')

// Проверить транслитерацию
console.log(transliterate('Тестовый Ассистент'))
```

### При проблемах с состоянием:
```javascript
// Zustand store debug
useStore.getState()
```

---

## 📊 Важные метрики производительности

### OpenAI API:
- **Polling interval:** оптимизированный в useStore
- **Duplicate calls:** должны отсутствовать в консоли
- **Error handling:** graceful fallbacks

### Database:
- **GIN индексы:** для JSONB files queries
- **RLS policies:** активны для всех таблиц
- **Connection pooling:** управляется Supabase

### Frontend:
- **Re-renders:** минимальные благодаря Zustand
- **Component patterns:** 1 компонент = 1 файл
- **TypeScript:** strict режим, no any

---

## 🚀 Шаблоны кода

### Новый метод в OpenAI service:
```typescript
async newMethod(param: string): Promise<ResultType> {
  if (!this.client) throw new Error('OpenAI client not initialized');
  
  try {
    const result = await this.client.someAPI({
      name: transliterate(param), // Если есть имена
      // другие параметры
    });
    return result;
  } catch (error) {
    throw new Error(`Failed to execute: ${error}`);
  }
}
```

### Новый store action:
```typescript
newAction: async (param: string) => {
  try {
    set(state => ({ loading: true }));
    
    // DB update
    const { data, error } = await supabase
      .from('table')
      .update({ field: param })
      .select();
      
    if (error) throw error;
    
    // OpenAI sync если нужно
    await get().openaiService.syncMethod();
    
    set(state => ({ 
      data: data,
      loading: false 
    }));
  } catch (error) {
    set(state => ({ 
      loading: false,
      error: error.message 
    }));
  }
}
```

---

## 📝 Заметки по развитию

### Следующие фичи (из PROJECT_ARCHITECTURE.md):
- File upload к ассистентам
- Function calling для ассистентов  
- Export/import чатов
- Аналитика использования

### Технический долг:
- Оптимизация bundle size
- Code splitting для больших компонентов
- Улучшение error boundaries

---

## 🔄 Спринтовая работа и циклы разработки

### Структура спринта:
```
🎯 НАЧАЛО СПРИНТА
├── "Давай добавим/изменим X"
├── Планирование (TodoWrite)
├── Реализация с экспериментами
├── Тестирование
├── Возможные откаты
└── Финальная реализация

📋 ЗАВЕРШЕНИЕ СПРИНТА (ОБЯЗАТЕЛЬНО!)
├── Обновить PROJECT_ARCHITECTURE.md
├── Обновить DATABASE_CHANGELOG.md (если были изменения БД)
├── Обновить CLAUDE.md (новые правила/ошибки)
├── Обновить README.md (версия + основные изменения)
├── Коммит с описанием изменений
└── 🎉 Минорный релиз готов
```

### 🚨 КРИТИЧНО: Завершающие действия спринта

**НИКОГДА не заканчивай спринт без обновления документации!**

#### Чеклист завершения спринта:
- [ ] **PROJECT_ARCHITECTURE.md** - обновить статус реализации, добавить новые компоненты
- [ ] **DATABASE_CHANGELOG.md** - задокументировать все изменения БД
- [ ] **CLAUDE.md** - добавить новые правила/ошибки из спринта  
- [ ] **README.md** - обновить версию и краткое описание изменений
- [ ] **Git commit** - с осмысленным сообщением о завершении спринта
- [ ] Убедиться что все TodoWrite задачи помечены как completed

#### Шаблон коммита завершения спринта:
```bash
git add .
git commit -m "Sprint: [Краткое описание фичи]

- Implemented: [основная функциональность]  
- Updated: PROJECT_ARCHITECTURE.md, DATABASE_CHANGELOG.md
- Fixed: [если были исправления]
- Docs: обновлена документация проекта

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Паттерны работы со спринтами:

#### Спринт с изменениями БД:
```
1. План миграции
2. Тест в dev  
3. Обновление типов TypeScript
4. Реализация в коде
5. ОБЯЗАТЕЛЬНО: DATABASE_CHANGELOG.md
6. ОБЯЗАТЕЛЬНО: PROJECT_ARCHITECTURE.md
```

#### Спринт с новой фичей:
```
1. Анализ архитектуры (читаем документы)
2. Планирование
3. Реализация  
4. Тестирование
5. ОБЯЗАТЕЛЬНО: PROJECT_ARCHITECTURE.md (новые компоненты)
6. ОБЯЗАТЕЛЬНО: CLAUDE.md (новые правила)
```

#### Спринт с багфиксом:
```
1. Диагностика
2. Исправление
3. Тестирование  
4. ОБЯЗАТЕЛЬНО: CLAUDE.md (добавить в "Частые проблемы")
5. ОБЯЗАТЕЛЬНО: README.md (обновить версию)
```

### 🎯 Цели циклической работы:
- **Документация всегда актуальна** 
- **Каждый спринт = минорное улучшение**
- **Накопление знаний** в CLAUDE.md
- **Git история** отражает логические завершения
- **Возможность отката** к любому завершенному спринту

---

*Этот файл должен обновляться при каждом завершении спринта*
*Цель: циклическая разработка с обязательным обновлением документации*
*Последнее обновление: 2025-12-08 - Удалены упоминания MaaS*