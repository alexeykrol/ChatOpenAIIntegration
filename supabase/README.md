# Supabase Database Management

Эта папка содержит все файлы связанные с управлением базой данных Supabase.

## 📁 Структура

### `/migrations/`
Официальные SQL миграции базы данных:
- `20250830143000_add_rag_support.sql` - RAG функционал
- `20250830160000_add_assistants_support.sql` - расширенная поддержка ассистентов

### `/scripts/`
Node.js скрипты для применения миграций и утилиты:
- `apply-rag-migration.mjs` - применить RAG миграцию
- `apply-assistants-migration.mjs` - применить миграцию ассистентов
- `apply-*.mjs` - другие миграционные скрипты
- `*.sql` - вспомогательные SQL файлы

### `/docs/`
Документация по базе данных:
- `DATABASE_CHANGELOG.md` - полная история изменений схемы БД

## 🚀 Использование

### Применение миграций
```bash
# Перейти в папку scripts
cd supabase/scripts

# Применить RAG миграцию
node apply-rag-migration.mjs

# Применить миграцию ассистентов
node apply-assistants-migration.mjs
```

### Просмотр документации
```bash
# Посмотреть историю изменений БД
cat supabase/docs/DATABASE_CHANGELOG.md
```

---

*Все служебные файлы БД организованы в этой папке для порядка в корне проекта*