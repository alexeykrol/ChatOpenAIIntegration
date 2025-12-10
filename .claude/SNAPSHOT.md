# SNAPSHOT — ChatOpenAII

*Последнее обновление: 2025-12-10*

## Текущее состояние

**Версия:** 0.1.0-mvp
**Статус:** MVP — функционален, требует hardening для production
**Ветка:** main

## О проекте

**Название:** ChatGPT Clone with OpenAI Integration
**Описание:** Полнофункциональный клон ChatGPT с поддержкой streaming, AI персоналий, управлением чатами и dark/light темой.

**Tech Stack:**
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS
- State: Zustand
- Backend: Supabase (Auth + PostgreSQL)
- AI: OpenAI API (GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-3.5 Turbo)

## Структура проекта

```
src/
├── components/           # React компоненты
│   ├── Auth.tsx          # Авторизация
│   ├── ChatArea.tsx      # Чат интерфейс
│   ├── Sidebar.tsx       # Навигация
│   ├── Settings.tsx      # Настройки
│   └── Personalities.tsx # AI персоналии
├── lib/                  # Сервисы
│   ├── openai.ts         # OpenAI streaming
│   ├── supabase.ts       # Database client
│   └── encryption.ts     # API key encryption
├── store/
│   └── useStore.ts       # Zustand store (~456 строк)
└── App.tsx               # Main component
```

## Что готово

- [x] Email/password авторизация (Supabase Auth)
- [x] Real-time streaming чат с OpenAI
- [x] Множество чатов с сохранением
- [x] AI персоналии с custom system prompts
- [x] Выбор моделей и параметров (temperature, max_tokens)
- [x] Dark/Light тема
- [x] Экспорт чатов (markdown/JSON)
- [x] Row Level Security в БД
- [x] Input validation и XSS prevention
- [x] Security headers в Vite config

## Активная работа

**Текущая фаза:** Production Hardening

- [ ] Backend proxy для OpenAI API
- [ ] Нормальное шифрование API ключей

## Следующие шаги

1. Создать backend proxy (убрать dangerouslyAllowBrowser)
2. Заменить XOR encryption на proper crypto
3. Добавить тесты
4. Настроить CI/CD

## Ключевые концепции

- **Streaming:** OpenAI SDK с async generators для real-time ответов
- **Personalities:** System prompts + memory toggle для контекста
- **Security:** RLS на всех таблицах, санитизация input

---
*Quick-start контекст для AI сессий*
