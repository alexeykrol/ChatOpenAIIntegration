# MaaS Student Assignment - Практическое задание

**Цель:** Создать полную структуру базы данных MaaS (Memory as a Service) в Supabase и интегрировать с Claude Code для автоматизации оставшихся таблиц.

**Время выполнения:** 1-2 часа
**Уровень:** Intermediate
**Требования:** Аккаунт Supabase, базовые знания SQL

---

## 🎯 Что вы получите в результате

В конце задания у вас будет:
- Полноценная БД MaaS с 9 таблицами
- Навыки работы с Supabase SQL Editor
- Опыт интеграции Claude Code с внешними БД
- Понимание архитектуры микросервисов для AI

---

## 📋 Шаг 1: Подготовка проекта Supabase

### 1.1 Создайте новый проект
1. Перейдите на [supabase.com](https://supabase.com)
2. Создайте новый проект с именем "MaaS-Learning"
3. **Сохраните пароль БД** - он понадобится!
4. Выберите ближайший регион

### 1.2 Настройка базовых расширений
В **SQL Editor** выполните:
```sql
-- Включаем расширение для UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Проверяем что расширение работает
SELECT gen_random_uuid();
```

---

## 📊 Шаг 2: Создание первых таблиц вручную

### 2.1 Таблица projects (СОЗДАЙТЕ ВРУЧНУЮ)

Эта таблица - основа MaaS. Каждый проект имеет миссию, цели и ограничения.

```sql
-- Создаем таблицу projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  mission TEXT,
  goals TEXT[] DEFAULT ARRAY[]::TEXT[],
  constraints TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_default BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Создаем индексы для производительности
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);

-- Ограничение: только один дефолтный проект на пользователя
CREATE UNIQUE INDEX idx_projects_default
ON projects(user_id, is_default)
WHERE is_default = true;

-- Добавляем комментарий для документации
COMMENT ON TABLE projects IS 'Проекты пользователей с миссией и целями';
```

### 2.2 Таблица maas_snapshots (СОЗДАЙТЕ ВРУЧНУЮ)

Таблица для хранения снапшотов контекста - результата работы MaaS pipeline.

```sql
-- Создаем таблицу для снапшотов контекста
CREATE TABLE maas_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_query TEXT NOT NULL,
  context_bundle JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX idx_maas_snapshots_session ON maas_snapshots(session_id);
CREATE INDEX idx_maas_snapshots_user ON maas_snapshots(user_id);
CREATE INDEX idx_maas_snapshots_created ON maas_snapshots(created_at DESC);

-- Комментарий
COMMENT ON TABLE maas_snapshots IS 'Сохраненные контексты для анализа и отладки';
```

### 2.3 Добавьте тестовые данные

```sql
-- Вставляем тестовый проект
INSERT INTO projects (user_id, name, mission, goals, is_default)
VALUES (
  'student-test-user',
  'My First MaaS Project',
  'Изучить архитектуру MaaS и построить собственный AI ассистент с памятью',
  ARRAY['Создать БД структуру', 'Интегрировать с Claude Code', 'Протестировать n8n workflow'],
  true
);

-- Вставляем тестовый снапшот
INSERT INTO maas_snapshots (session_id, user_id, user_query, context_bundle)
VALUES (
  'learning-session-1',
  'student-test-user',
  'What is MaaS and how does it work?',
  '{
    "mission": "Изучить архитектуру MaaS",
    "recent_context": "Студент изучает основы Memory as a Service",
    "facts": [],
    "instructions": ["Explain concepts clearly", "Provide examples", "Encourage learning"]
  }'::jsonb
);
```

---

## 🤖 Шаг 3: Интеграция с Claude Code

### 3.1 Подготовьте доступы
1. В Supabase перейдите в **Settings > API**
2. Скопируйте:
   - **Project URL** (https://xxxxx.supabase.co)
   - **anon public key** (ключ начинается с eyJhbGciOiJIUzI1NiI...)

### 3.2 Создайте функцию exec_sql

Эта функция позволит Claude Code выполнять SQL команды через API:

```sql
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;
```

### 3.3 Дайте доступы Claude Code

Скажите Claude Code:

```
У меня есть проект Supabase для MaaS:
URL: [ваш URL]
anon key: [ваш ключ]

Создай оставшиеся 7 таблиц MaaS: facts, thread_summaries, decisions, links, sources, maas_metrics, snapshot_cache
```

Claude Code автоматически создаст все оставшиеся таблицы!

---

## 📚 Шаг 4: Изучение созданной структуры

После того как Claude Code создаст таблицы, изучите их:

### 4.1 Просмотр всех таблиц
```sql
-- Посмотрите все созданные таблицы
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

### 4.2 Изучение связей между таблицами
```sql
-- Посмотрите foreign key связи
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
```

### 4.3 Тестирование связей
```sql
-- Получите ID вашего проекта
SELECT id, name FROM projects WHERE user_id = 'student-test-user';

-- Добавьте факт (замените PROJECT_ID на реальный ID)
INSERT INTO facts (project_id, session_id, subject, value, level, source_type)
VALUES (
  'YOUR_PROJECT_ID_HERE',
  'learning-session-1',
  'MaaS Components',
  '{"components": ["projects", "facts", "decisions", "links"], "purpose": "AI memory management"}'::jsonb,
  'fact',
  'user_stated'
);

-- Проверьте что факт создался
SELECT * FROM facts WHERE session_id = 'learning-session-1';
```

---

## 🔍 Шаг 5: Проверка результата

### 5.1 Полный список таблиц
Убедитесь что у вас есть все 9 таблиц:

1. ✅ **projects** - проекты с миссией
2. ✅ **maas_snapshots** - снапшоты контекста
3. ✅ **facts** - извлеченные факты
4. ✅ **thread_summaries** - саммари диалогов
5. ✅ **decisions** - принятые решения
6. ✅ **links** - связи между сущностями
7. ✅ **sources** - источники информации
8. ✅ **maas_metrics** - метрики производительности
9. ✅ **snapshot_cache** - кеш для оптимизации

### 5.2 Итоговая проверка
```sql
-- Посчитайте количество таблиц
SELECT COUNT(*) as total_tables
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'projects', 'maas_snapshots', 'facts', 'thread_summaries',
  'decisions', 'links', 'sources', 'maas_metrics', 'snapshot_cache'
);

-- Результат должен быть: 9
```

---

## 🎓 Что вы изучили

### Технические навыки:
- ✅ Создание таблиц в PostgreSQL/Supabase
- ✅ Использование UUID как Primary Key
- ✅ Работа с JSONB для гибкого хранения данных
- ✅ Создание индексов для производительности
- ✅ Настройка Foreign Key связей
- ✅ Интеграция с Claude Code API

### Архитектурные концепции:
- ✅ Микросервисная архитектура (MaaS как отдельный сервис)
- ✅ Разделение ответственности (основное приложение vs память)
- ✅ API-first подход к интеграции сервисов
- ✅ Структурирование данных для AI workflow

### MaaS специфика:
- ✅ Как хранить проекты с миссией и целями
- ✅ Структура для фактов с атрибуцией
- ✅ Система принятия и отслеживания решений
- ✅ Граф знаний через таблицу links

---

## 🚀 Следующие шаги

После завершения задания вы можете:

1. **Изучить n8n интеграцию** - создать workflow для MaaS
2. **Интегрировать с основным приложением** - добавить вызовы MaaS
3. **Экспериментировать с данными** - добавлять факты и решения
4. **Изучить оптимизацию** - кеширование и индексы

---

## 🔧 Troubleshooting

### Проблема: "relation does not exist"
**Решение:** Убедитесь что создали таблицу и используете правильное имя

### Проблема: "permission denied"
**Решение:** Проверьте что функция exec_sql создана с SECURITY DEFINER

### Проблема: Claude Code не может подключиться
**Решение:** Проверьте URL и anon key, убедитесь что нет лишних пробелов

### Проблема: Foreign key constraint fails
**Решение:** Сначала создайте связанную таблицу (например, projects перед facts)

---

## 📝 Отчет о выполнении

После завершения задания создайте краткий отчет:

1. **Скриншот Table Editor** в Supabase со всеми таблицами
2. **Результат SQL запроса** с количеством записей в каждой таблице:
   ```sql
   SELECT
     'projects' as table_name, COUNT(*) as records FROM projects
   UNION ALL
   SELECT 'facts', COUNT(*) FROM facts
   UNION ALL
   SELECT 'maas_snapshots', COUNT(*) FROM maas_snapshots;
   ```
3. **Одно предложение** о том, что было самым сложным
4. **Одно предложение** о том, что показалось наиболее интересным

---

## 🎉 Поздравляем!

Вы успешно создали полную структуру MaaS и получили практический опыт работы с:
- PostgreSQL/Supabase
- Claude Code интеграцией
- Архитектурой микросервисов
- AI memory management системами

Теперь вы понимаете как работают современные AI системы с памятью и можете создавать собственные решения!

---

*Это задание разработано для углубленного изучения архитектуры AI систем*
*Если у вас возникли вопросы - обратитесь к инструктору*