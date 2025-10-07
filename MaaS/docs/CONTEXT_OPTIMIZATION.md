# AI CONTEXT OPTIMIZATION - Knowledge Base
*Микро база знаний по оптимизации контекста для AI-экспертов*

---

## 📋 ИСХОДНАЯ ПРОБЛЕМА

### Контекст пользователя
"У меня в другом проекте именно такая задача есть. Общая идея в том, что я хочу сделать эксперта на основе ИИ, и все уже в общем реализовано (ты и реализовывал), но я уперся в подход оптимизации промпта, ровно подобная ситуация."

### Общая формулировка проблемы
При создании AI-эксперта для специализированных задач возникает проблема управления контекстом:
- **Длинные диалоги** быстро исчерпывают лимит токенов
- **Большие объемы кода** и документации требуют постоянного чтения
- **Потеря важной информации** при сжатии контекста
- **Неэффективное использование** окна контекста

---

## 💡 DISCOVERED PATTERNS

### Из опыта проекта PanicButton
1. **Копирайтинг-first подход**: работа с одним мастер-файлом (COPYWRITING_MASTER.md), AI обновляет все остальное
2. **Частичное чтение файлов**: использование offset/limit для больших файлов
3. **Batch операции**: MultiEdit вместо множественных правок
4. **Явное управление workflow**: четкие роли (пользователь редактирует X, AI обновляет Y)

---

## 🎯 РЕШЕНИЕ: СИСТЕМА ОПТИМИЗАЦИИ КОНТЕКСТА

### 1. Иерархия контекста

```
Permanent Context (редко меняется, ~10% токенов):
├── System rules (tone, safety, behavior)
├── Project architecture
├── Core workflows
└── Key constraints

Session Context (обновляется по задачам, ~30% токенов):
├── Current task description
├── Recent changes summary
├── Active files list
└── Task-specific rules

Working Context (активная работа, ~50% токенов):
├── Current file contents
├── Last 5-10 operations
├── Error messages
└── User's last requests

Disposable Context (можно удалить, ~10% токенов):
├── Intermediate results
├── Debug outputs
├── Old iterations
└── Resolved errors
```

### 2. Стратегии сжатия контекста

#### Вертикальное сжатие (убираем детали)
```python
# BEFORE (150 tokens)
"User requested to add a red button with 50x100px dimensions,
rounded corners of 5px, centered text 'Submit', onClick handler
that validates form and sends data to /api/submit endpoint"

# AFTER (30 tokens)
"Added red Submit button with form validation → /api/submit"
```

#### Горизонтальное сжатие (группируем похожее)
```python
# BEFORE (100 tokens)
"Modified Button.tsx line 23
Modified Button.tsx line 45
Modified Button.tsx line 67
Modified Form.tsx line 12"

# AFTER (20 tokens)
"Updated: Button.tsx (L23,45,67), Form.tsx (L12)"
```

#### Семантическое сжатие (сохраняем смысл)
```python
# BEFORE (200 tokens)
"Tried approach A - failed with error X
Tried approach B - failed with error Y
Tried approach C - worked"

# AFTER (25 tokens)
"Solved via approach C after 2 failed attempts"
```

### 3. Умное хранение состояния

```python
class ContextManager:
    def __init__(self):
        self.permanent = self._load_permanent()  # Загружается один раз
        self.session = {}  # Живет всю сессию
        self.working = deque(maxlen=10)  # Кольцевой буфер
        self.compressed_history = []  # Сжатая история

    def add_operation(self, op):
        self.working.append({
            'timestamp': time.now(),
            'type': op.type,
            'summary': op.summary,
            'details': op.details if op.important else None
        })

    def compress_working_memory(self):
        """Сжимает working memory в session context"""
        if len(self.working) < 8:
            return

        # Группируем по типам операций
        grouped = defaultdict(list)
        for op in self.working:
            grouped[op['type']].append(op['summary'])

        # Создаем сжатое представление
        compressed = {
            'time_range': (self.working[0]['timestamp'],
                          self.working[-1]['timestamp']),
            'operations': {
                op_type: f"{len(ops)} operations: {', '.join(ops[:3])}..."
                for op_type, ops in grouped.items()
            }
        }

        self.compressed_history.append(compressed)
        self.working.clear()

    def get_context(self, detail_level='normal'):
        """Собирает контекст для промпта"""
        if detail_level == 'minimal':
            return {
                'permanent': self.permanent['core'],
                'session': self.session.get('task'),
                'working': list(self.working)[-3:]
            }
        elif detail_level == 'normal':
            return {
                'permanent': self.permanent,
                'session': self.session,
                'working': list(self.working),
                'history': self.compressed_history[-2:]
            }
        else:  # full
            return self.__dict__
```

### 4. RAG-подобный подход для кода

```python
class CodeIndexer:
    def __init__(self, project_path):
        self.index = {
            'files': {},
            'functions': {},
            'classes': {},
            'imports': {},
            'dependencies': {}
        }
        self._build_index(project_path)

    def _build_index(self, path):
        """Индексирует проект один раз"""
        for file in walk_files(path):
            ast = parse_file(file)
            self.index['files'][file] = {
                'hash': hash_file(file),
                'size': file.size,
                'modified': file.mtime,
                'summary': extract_summary(ast)
            }
            # Индексируем функции, классы и т.д.

    def get_relevant_context(self, query):
        """Возвращает только релевантный код"""
        relevant = []

        # Ищем по имени
        if func := self.index['functions'].get(query):
            relevant.append(load_function_with_context(func))

        # Ищем по зависимостям
        deps = self.index['dependencies'].get(query, [])
        for dep in deps[:3]:  # Максимум 3 зависимости
            relevant.append(load_summary(dep))

        return relevant
```

### 5. Контекстные якоря (Context Anchors)

```markdown
# В начале сессии устанавливаем якоря
#PROJECT: AI Expert System for {domain}
#STACK: Python, FastAPI, PostgreSQL, OpenAI
#ARCHITECTURE: microservices, event-driven
#WORKFLOW: user edits config → AI updates code → test → deploy
#CURRENT_TASK: optimizing prompt management
#CONSTRAINTS:
  - No external API calls in tests
  - Type hints required
  - Max 8000 tokens per request

# Потом используем кратко
"Continue #CURRENT_TASK following #WORKFLOW"
"Error violates #CONSTRAINTS.no_external_api"
```

### 6. Прогрессивная детализация

```python
class ProgressiveContext:
    """Контекст, который растет по мере необходимости"""

    def __init__(self):
        self.levels = {
            'micro': 500,     # tokens
            'mini': 1000,
            'normal': 4000,
            'extended': 8000,
            'full': 16000
        }

    def build(self, target_level='normal'):
        context = []
        tokens_used = 0
        max_tokens = self.levels[target_level]

        # Приоритет 1: Критически важное
        critical = self.get_critical_context()
        context.append(critical)
        tokens_used += count_tokens(critical)

        # Приоритет 2: Текущая задача
        if tokens_used < max_tokens * 0.5:
            task = self.get_task_context()
            context.append(task)
            tokens_used += count_tokens(task)

        # Приоритет 3: Недавние изменения
        if tokens_used < max_tokens * 0.7:
            recent = self.get_recent_changes()
            context.append(recent)
            tokens_used += count_tokens(recent)

        # Приоритет 4: Дополнительный контекст
        if tokens_used < max_tokens * 0.9:
            extra = self.get_extra_context(max_tokens - tokens_used)
            context.append(extra)

        return '\n'.join(context)
```

### 7. Паттерн "Контекстная память"

```python
class ContextMemory:
    """Память, которая переживает сессии"""

    def __init__(self, project_id):
        self.project_id = project_id
        self.storage_path = f".ai_context/{project_id}"
        self.memory = self._load_or_create()

    def remember_pattern(self, pattern_name, context, solution):
        """Запоминает успешные паттерны решений"""
        self.memory['patterns'][pattern_name] = {
            'context': compress(context),
            'solution': solution,
            'usage_count': 0,
            'success_rate': 1.0
        }

    def recall_similar(self, current_context):
        """Находит похожие решенные задачи"""
        similarities = []
        for name, pattern in self.memory['patterns'].items():
            score = calculate_similarity(current_context, pattern['context'])
            if score > 0.7:
                similarities.append((score, name, pattern))

        return sorted(similarities, reverse=True)[:3]

    def update_success(self, pattern_name, success=True):
        """Обновляет статистику использования паттерна"""
        if pattern := self.memory['patterns'].get(pattern_name):
            pattern['usage_count'] += 1
            # Скользящее среднее success rate
            alpha = 0.1
            pattern['success_rate'] = (
                alpha * (1.0 if success else 0.0) +
                (1 - alpha) * pattern['success_rate']
            )
```

---

## 🚀 ПРАКТИЧЕСКАЯ РЕАЛИЗАЦИЯ

### Шаг 1: Создайте базовую структуру

```python
# context_optimizer.py
class AIContextOptimizer:
    def __init__(self, project_config):
        self.config = project_config
        self.context_manager = ContextManager()
        self.code_indexer = CodeIndexer(project_config.path)
        self.memory = ContextMemory(project_config.id)

    def process_user_request(self, request):
        # 1. Проверяем память на похожие задачи
        similar = self.memory.recall_similar(request)

        # 2. Строим контекст
        context = self.build_optimal_context(request, similar)

        # 3. Отправляем в AI
        response = self.send_to_ai(context)

        # 4. Сохраняем результат
        self.memory.remember_pattern(
            extract_pattern_name(request),
            context,
            response
        )

        return response
```

### Шаг 2: Определите правила сжатия для вашего домена

```python
# domain_rules.py
COMPRESSION_RULES = {
    'code_changes': {
        'keep': ['function_signatures', 'api_changes', 'schema_changes'],
        'compress': ['formatting', 'comments', 'minor_refactors'],
        'discard': ['debug_prints', 'temporary_variables']
    },
    'conversations': {
        'keep': ['decisions', 'requirements', 'constraints'],
        'compress': ['discussions', 'alternatives'],
        'discard': ['greetings', 'confirmations']
    }
}
```

### Шаг 3: Настройте систему якорей

```python
# anchors.py
PROJECT_ANCHORS = {
    'MUST_PRESERVE': [
        'security_requirements',
        'api_contracts',
        'data_schemas'
    ],
    'COMPRESS_AGGRESSIVELY': [
        'ui_details',
        'style_changes',
        'documentation'
    ]
}
```

---

## 📊 МЕТРИКИ ЭФФЕКТИВНОСТИ

```python
def measure_context_efficiency(self):
    return {
        'compression_ratio': len(self.original) / len(self.compressed),
        'information_retention': self.calculate_retention_score(),
        'token_usage': self.tokens_used / self.token_limit,
        'relevant_context_ratio': self.relevant_tokens / self.total_tokens
    }
```

---

## 🎓 КЛЮЧЕВЫЕ ВЫВОДЫ

1. **Контекст - это не просто текст**, это структурированная иерархия информации
2. **Сжатие должно быть семантическим**, а не механическим
3. **Память между сессиями** критически важна для специализированных экспертов
4. **RAG-подход работает** не только для документов, но и для кода
5. **Прогрессивная детализация** позволяет эффективно использовать токены

---

## 🔄 КАК ИСПОЛЬЗОВАТЬ В НОВОМ ПРОЕКТЕ

1. Скопируйте этот файл в корень вашего проекта AI-эксперта
2. При старте новой сессии с Claude скажите:
   ```
   "Прочитай CONTEXT_OPTIMIZATION.md и используй эти паттерны для оптимизации нашей работы"
   ```
3. Claude поймет контекст и сможет:
   - Применить эти паттерны к вашему проекту
   - Предложить специфичные для вашего домена оптимизации
   - Продолжить с того места, где вы остановились

---

## 📝 ИСТОРИЯ ДИАЛОГА

### Исходный контекст
- **Проект**: PanicButton (сатирический лендинг)
- **Проблема**: Быстрое заполнение контекста при работе с большими файлами локализации и множеством компонентов
- **Решение**: Workflow через единый мастер-файл + автоматическое обновление всех зависимостей

### Эволюция понимания
1. Начали с простого копирайтинга
2. Обнаружили проблему с токенами при работе с 4 языками
3. Разработали систему работы через COPYWRITING_MASTER.md
4. Выявили общие паттерны оптимизации контекста
5. Сформулировали универсальные подходы для AI-экспертов

---

*Этот документ - живая база знаний. Дополняйте его новыми паттернами и решениями.*