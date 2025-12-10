# BACKLOG — ChatOpenAII

*Задачи для достижения Production-Ready статуса*

## Активный спринт: Production Hardening

### Высокий приоритет

- [ ] **Backend proxy для OpenAI API**
  - Убрать `dangerouslyAllowBrowser: true`
  - Edge Function в Supabase или отдельный backend
  - API ключ хранить только на сервере

- [ ] **Нормальное шифрование**
  - Заменить XOR encryption на AES-256-GCM
  - Использовать Web Crypto API
  - Или перенести шифрование на backend

- [ ] **Исправить npm vulnerabilities**
  - @eslint/plugin-kit (ReDoS)
  - esbuild (dev server security)
  - prismjs (DOM Clobbering)

### Средний приоритет

- [ ] **Unit тесты**
  - Vitest setup
  - Тесты для useStore.ts
  - Тесты для openai.ts service

- [ ] **E2E тесты**
  - Playwright setup
  - Auth flow тесты
  - Chat flow тесты

- [ ] **CI/CD pipeline**
  - GitHub Actions workflow
  - Lint + Type check + Tests
  - Auto-deploy на Vercel/Netlify

### Низкий приоритет

- [ ] **Rate limiting**
  - Ограничение запросов к OpenAI
  - Защита от abuse

- [ ] **Error monitoring**
  - Sentry integration
  - Error boundaries в React

## Backlog

### Фичи

- [ ] Голосовой ввод (Web Speech API)
- [ ] Image generation (DALL-E integration)
- [ ] File attachments в чат
- [ ] Shared chats (публичные ссылки)
- [ ] Export в PDF

### Улучшения UX

- [ ] Mobile responsive improvements
- [ ] Keyboard shortcuts panel
- [ ] Message search
- [ ] Chat folders/categories
- [ ] Drag & drop chat reordering

### Технический долг

- [ ] Разбить useStore.ts на слайсы
- [ ] Добавить error boundaries
- [ ] Оптимизировать ре-рендеры (React.memo)
- [ ] Типизация Supabase responses

## Завершено

### Недавно завершено

- [x] Fix Framework /ui command — workarounds для ES modules, express deps (2025-12-10)
- [x] Bug Report — документирование 5 багов Framework (2025-12-10)
- [x] Legacy Migration — полный анализ проекта и генерация Framework файлов (2025-12-09)
- [x] Инициализация Claude Code Starter Framework (2025-12-09)
- [x] Security headers в vite.config.ts
- [x] Input validation во всех компонентах
- [x] XSS prevention
- [x] MaaS cleanup (удаление неиспользуемого кода)

---
*Используй `/feature` для планирования новых фич*
*Используй `/fix` для исправления багов*
