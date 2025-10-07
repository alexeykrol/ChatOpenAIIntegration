# ChatOpenAI Integration Assistant

**Version: 1.6** | **Last Updated: 2025-01-31**

Приложение для работы с OpenAI API с поддержкой ассистентов, RAG (Retrieval-Augmented Generation) и векторного поиска. Включает экспериментальную интеграцию с MaaS (Memory as a Service).

---

## 📚 Documentation

### For Developers & AI Agents
- **[AGENTS.md](AGENTS.md)** - AI agent instructions and development guidelines
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture and technical decisions
- **[BACKLOG.md](BACKLOG.md)** - Implementation status and roadmap (SINGLE SOURCE OF TRUTH)
- **[WORKFLOW.md](WORKFLOW.md)** - Development workflows and sprint processes
- **[supabase/docs/DATABASE_CHANGELOG.md](supabase/docs/DATABASE_CHANGELOG.md)** - Database schema history

### Quick Start for AI Agents
1. Read [AGENTS.md](AGENTS.md) - Core instructions and patterns
2. Read [ARCHITECTURE.md](ARCHITECTURE.md) - System design
3. Read [BACKLOG.md](BACKLOG.md) - Current status and priorities
4. Read [WORKFLOW.md](WORKFLOW.md) - Sprint processes

---

## ✨ Новые возможности v1.6

- 📚 **Реструктуризация документации** - разделение на AGENTS.md, ARCHITECTURE.md, BACKLOG.md, WORKFLOW.md
- 🤖 **Универсальные инструкции для AI** - совместимость с Claude Code, Cursor, Copilot
- 📋 **Четкий бэклог** - BACKLOG.md как единый источник истины для статуса проекта
- 🔄 **Стандартизированные процессы** - WORKFLOW.md с чеклистами и шаблонами

## ✨ Возможности v1.5

- 🧠 **MaaS (Memory as a Service)** - независимый микросервис для управления памятью AI
- 📊 **Персонализированная саммаризация** - настройки памяти для каждого ассистента
- 🔄 **Архитектура микросервисов** - MaaS работает как отдельный сервис через API

## ✨ Возможности v1.3

- 🏗️ **Модульная архитектура** - независимые сервисы для управления ассистентами и векторными хранилищами
- 📁 **Полная векторизация файлов** - загруженные файлы автоматически векторизуются для семантического поиска
- 🔧 **Оптимизированы API-вызовы** - убрано дублирование запросов к OpenAI
- 🌐 **Автотранслитерация имен** - кириллические имена автоматически конвертируются для OpenAI
- 🔄 **Синхронизация с OpenAI** - изменения имен ассистентов автоматически синхронизируются

## 🚀 Основные возможности

- **Мультиперсональные чаты** с настраиваемыми ассистентами OpenAI
- **RAG поддержка** для работы с документами (PDF, DOCX, TXT)
- **Векторный поиск** по загруженным файлам через OpenAI Vector Stores
- **Управление контекстом** и память разговоров
- **Подсчет токенов** и мониторинг использования API
- **Безопасное хранение** API-ключей с шифрованием

## 🛠️ Технологии

- **Frontend:** React 18, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Storage)
- **AI:** OpenAI Assistants API, Vector Stores API, Embeddings API
- **Векторная БД:** OpenAI Vector Stores для семантического поиска

---

## 🚀 Quick Start (для разработчиков)

### Prerequisites
- Node.js 18+ (рекомендуется LTS)
- npm или yarn
- OpenAI API key
- Supabase account

### Installation
```bash
# 1. Clone repository
git clone https://github.com/ваш-репозиторий/ChatOpenAIIntegrationAssist.git
cd ChatOpenAIIntegrationAssist

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 4. Apply database migrations
cd supabase/scripts
node apply-migration.mjs  # Follow latest migration in ../migrations/

# 5. Start development server
npm run dev
```

### First Run
1. Open http://localhost:5173/
2. Sign up with email/password
3. Add OpenAI API key in Settings
4. Create your first personality/assistant
5. Start chatting!

---

## 📦 Подробная инструкция по установке (для начинающих)

### Шаг 1: Установка необходимых программ

#### 1.1 Установка Node.js
Node.js - это программа для запуска JavaScript кода на вашем компьютере.

1. Перейдите на сайт https://nodejs.org/
2. Скачайте версию "LTS" (рекомендуемая стабильная версия)
3. Запустите скачанный установщик
4. Следуйте инструкциям установщика, оставляя все настройки по умолчанию
5. После установки откройте командную строку (Terminal на Mac, cmd на Windows)
6. Введите команду `node --version` и нажмите Enter
7. Если появилась версия (например, v20.11.0), установка прошла успешно

#### 1.2 Установка Git
Git - это программа для скачивания кода из интернета.

**Для Windows:**
1. Скачайте Git с https://git-scm.com/download/windows
2. Запустите установщик
3. Оставьте все настройки по умолчанию, просто нажимайте "Next"

**Для Mac:**
1. Откройте Terminal
2. Введите команду: `git --version`
3. Если Git не установлен, система предложит его установить
4. Следуйте инструкциям

### Шаг 2: Скачивание проекта

1. Создайте папку для проекта (например, на рабочем столе)
2. Откройте командную строку (Terminal/cmd)
3. Перейдите в созданную папку командой:
   ```bash
   # Для Windows (если папка на рабочем столе):
   cd C:\Users\ВашеИмя\Desktop\ВашаПапка
   
   # Для Mac (если папка на рабочем столе):
   cd ~/Desktop/ВашаПапка
   ```
   *Замените "ВашеИмя" и "ВашаПапка" на реальные названия*

4. Скачайте проект командой:
   ```bash
   git clone https://github.com/ваш-репозиторий/ChatOpenAIIntegrationAssist.git
   ```
   *Замените "ваш-репозиторий" на реальный адрес*

5. Перейдите в папку проекта:
   ```bash
   cd ChatOpenAIIntegrationAssist
   ```

### Шаг 3: Установка зависимостей

Зависимости - это дополнительные программы, необходимые для работы приложения.

1. В командной строке (уже находясь в папке проекта) введите:
   ```bash
   npm install
   ```
2. Дождитесь окончания установки (может занять 2-5 минут)
3. Если появились предупреждения (warnings) - это нормально
4. Если появились ошибки (errors) - обратитесь за помощью

### Шаг 4: Получение API ключа OpenAI

API ключ - это пароль для доступа к искусственному интеллекту OpenAI.

1. Зарегистрируйтесь на https://platform.openai.com/
2. Подтвердите email
3. Перейдите в раздел "API keys" (https://platform.openai.com/api-keys)
4. Нажмите кнопку "Create new secret key"
5. Дайте ключу имя (например, "ChatAssistant")
6. **ВАЖНО:** Скопируйте ключ сразу! Он больше не покажется
7. Сохраните ключ в надежном месте (например, в файле на компьютере)

**Примечание о стоимости:**
- Использование OpenAI API платное
- Новые аккаунты получают бесплатные кредиты ($5-18)
- Стоимость зависит от использования (примерно $0.01-0.03 за запрос)
- Установите лимиты в настройках OpenAI для контроля расходов

### Шаг 5: Настройка Supabase (база данных)

Supabase - это бесплатная база данных для хранения ваших чатов.

1. Зарегистрируйтесь на https://supabase.com/ (можно через GitHub)
2. Нажмите "New project" (Новый проект)
3. Заполните:
   - **Name:** ChatAssistant (или любое название)
   - **Database Password:** придумайте сложный пароль и сохраните его
   - **Region:** выберите ближайший регион (например, Frankfurt для Европы)
4. Нажмите "Create new project" и подождите 2-3 минуты

### Шаг 6: Настройка базы данных

1. В Supabase перейдите в раздел "SQL Editor" (слева в меню)
2. Нажмите "New query" (Новый запрос)
3. Откройте файлы из папки проекта `supabase/migrations/` по очереди
4. Для каждого файла:
   - Скопируйте содержимое файла
   - Вставьте в SQL Editor
   - Нажмите "Run" (Выполнить)
   - Дождитесь сообщения "Success"
5. Выполните файлы в порядке их дат (сначала более ранние)

### Шаг 7: Создание файла настроек

1. В папке проекта создайте файл `.env.local` (точка в начале обязательна!)
2. Откройте его в текстовом редакторе (Блокнот на Windows, TextEdit на Mac)
3. Вставьте следующее:
   ```
   VITE_SUPABASE_URL=ваш_url_supabase
   VITE_SUPABASE_ANON_KEY=ваш_anon_ключ
   ```

4. Получите эти данные из Supabase:
   - Перейдите в "Settings" → "API"
   - Скопируйте "Project URL" и вставьте вместо `ваш_url_supabase`
   - Скопируйте "anon public" ключ и вставьте вместо `ваш_anon_ключ`

5. Сохраните файл

### Шаг 8: Запуск приложения

1. В командной строке (в папке проекта) введите:
   ```bash
   npm run dev
   ```
2. Появится сообщение с адресом, например:
   ```
   Local: http://localhost:5173/
   ```
3. Откройте этот адрес в браузере (Chrome, Firefox, Safari)
4. Приложение должно открыться!

### Шаг 9: Первое использование

1. **Регистрация:**
   - Нажмите "Sign Up" (Регистрация)
   - Введите email и пароль
   - Подтвердите email (проверьте почту)

2. **Добавление API ключа:**
   - После входа нажмите на иконку настроек (шестеренка)
   - Вставьте ваш OpenAI API ключ
   - Нажмите "Save" (Сохранить)

3. **Создание первого ассистента:**
   - Нажмите "+ New Personality" (Новая личность)
   - Введите имя (например, "Помощник")
   - Введите инструкции (например, "Ты дружелюбный помощник")
   - Нажмите "Create" (Создать)

4. **Загрузка файлов (опционально):**
   - При создании личности можно перетащить файлы в специальную область
   - Поддерживаются форматы: PDF, DOCX, TXT
   - Файлы будут использоваться ассистентом для ответов

## 🔧 Ежедневное использование

### Запуск приложения
1. Откройте командную строку
2. Перейдите в папку проекта:
   ```bash
   cd путь/к/ChatOpenAIIntegrationAssist
   ```
3. Запустите:
   ```bash
   npm run dev
   ```
4. Откройте http://localhost:5173/ в браузере

### Остановка приложения
- В командной строке нажмите `Ctrl+C` (Windows) или `Cmd+C` (Mac)

## ❓ Решение проблем

### Ошибка "npm: command not found"
- Node.js не установлен или не добавлен в PATH
- Переустановите Node.js, следуя инструкции выше

### Ошибка "Cannot find module"
- Не установлены зависимости
- Выполните `npm install` в папке проекта

### Приложение не открывается
- Проверьте, запущен ли сервер (`npm run dev`)
- Проверьте правильность адреса (http://localhost:5173/)
- Попробуйте другой браузер

### Ошибка подключения к Supabase
- Проверьте файл `.env.local`
- Убедитесь, что URL и ключи скопированы правильно
- Проверьте, не истек ли проект Supabase (бесплатные проекты останавливаются после 7 дней неактивности)

### Ошибка OpenAI API
- Проверьте правильность API ключа
- Проверьте баланс в аккаунте OpenAI
- Убедитесь, что ключ активен

## 📝 Дополнительная информация

### Структура проекта
- `src/` - исходный код приложения
- `src/components/` - компоненты интерфейса
- `src/lib/` - сервисы для работы с API
- `supabase/migrations/` - файлы для настройки базы данных
- `.env.local` - файл с секретными настройками (не загружается в Git)

### Безопасность
- Никогда не делитесь своими API ключами
- Не загружайте файл `.env.local` в публичные репозитории
- Регулярно проверяйте использование API в панели OpenAI
- Установите лимиты расходов в настройках OpenAI

---

*Разработано с использованием [Claude Code](https://claude.ai/code)*