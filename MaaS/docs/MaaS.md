* MaaS — Функциональные абстракции и процессы (без привязки к техреализации)

	**1) Сущности (абстрактные)**
    * **Проект**: миссия, цели, ограничения, статус, вехи.
    * **Запрос**: намерение пользователя в момент времени, связка с проектом.
    * **Снапшот проекта**: актуальный контекст на момент инференса (миссия, факты, решения, открытые вопросы, краткая хронология).
    * **Факт**: проверяемое утверждение, связанное с источником.
    * **Гипотеза**: непроверенное объяснение/предположение.
    * **Интерпретация**: вывод/точка зрения, опирающаяся на факты.
    * **Решение**: зафиксированный выбор/договорённость.
    * **Артефакт**: документ/файл/сообщение/исследование.
    * **Источник**: откуда поступили данные (цитата/линк/сообщение).
    * **Связь**: отношение между сущностями (причина, аналогия, зависимость, временная и т.п.).
    * **Корпус знаний**: внешняя база знаний (RAG), доступная проекту.
* **2) Роли**
    * **Эксперт (агент)**: достигает целей, действует под неопределённостью.
    * **Память как сервис (MaaS)**: хранит и выдаёт информацию, поддерживает сбор контекста, ассоциации, атрибуцию.
    * **Оркестратор контекста**: формирует составной промпт («пирог») из снапшота и корпуса знаний.
* **3) Процесс (pipeline) — этапы**
    1. **Нормализация запроса**

	Цель: понять, к какому проекту относится запрос, извлечь намерение, сущности, ограничения.

	Вход: запрос.

	Выход: нормализованный запрос (intent, entities, project\_binding, constraints).
    2. **Актуализация истории**

	Цель: учесть новые сообщения/артефакты; обновить факты/решения/связи.

	Вход: история проекта + новые данные.

	Выход: обновлённая история (факты с атрибуцией, решения, связи, открытые вопросы).
    3. **Сбор снапшота проекта**

	Цель: собрать минимально достаточный контекст для задачи.

	Принципы: иерархия контекста, якоря (must‑preserve), прогрессивная детализация, сжатие (вертик./горизонт./семантич.).

	Вход: история проекта, нормализованный запрос.

	Выход: снапшот (миссия, релевантные факты/решения, краткая хронология, открытые вопросы, цитаты).
    4. **Ретрив из корпуса знаний**

	Цель: дополнить снапшот релевантными знаниями из внешнего корпуса.

	Вход: нормализованный запрос, снапшот.

	Выход: набор выдержек/цитат с атрибуцией.
    5. **Композиция контекста («пирог»)**

	Цель: объединить снапшот + выдержки знаний в составной контекст под бюджет токенов; зафиксировать инструкции.

	Вход: снапшот, выдержки из корпуса, бюджет контекста.

	Выход: context\_bundle (инструкции, факты с источниками, решения, выдержки RAG, ограничения, список цитат).
    6. **Инференс и ответ**

	Цель: получить осмысленный ответ эксперта на основе context\_bundle.

	Вход: context\_bundle.

	Выход: ответ пользователю.
    7. **Write‑back (интеграция опыта)**

	Цель: зафиксировать новые факты/решения/связи, возникшие в ответе; обновить открытые вопросы.

	Политики: no‑source → не в долговременную память; конфликт → пометка + уточнение.

	Вход: ответ, источники.

	Выход: обновлённая история проекта.
* **4) Правила качества (как свойства процесса)**
    * **Проект‑центричность**: всё привязано к проекту и его миссии/целям.
    * **Атрибуция**: любой существенный факт/выдержка сопровождается источником.
    * **Ассоциативность**: разрешено формировать связи между разрозненными фрагментами, фиксировать «мосты».
    * **Бюджет контекста**: сбор контекста управляется лимитом; снизу обрезаются наименее приоритетные части.
    * **Детерминизм**: одинаковый ввод → одинаковый контекст при тех же правилах.
    * **Прозрачность**: различение факт/гипотеза/интерпретация/решение.
    * **Регулярность**: процесс повторяется на каждый новый запрос, динамичны только данные.
* MaaS — Архитектура данных (логическая модель)

	**1) Сущности и ключевые поля**
    * **Project**: id, name, mission, goals, constraints, status, created\_at, updated\_at
    * **Thread**: id, project\_id, scope\_flag(in\|out\|mixed), created\_at
    * **Message**: id, thread\_id, role(user\|assistant\|system), text, created\_at
    * **Fact**: id, project\_id, subject, value, level(fact\|hypothesis\|interpretation\|decision), source\_ref(type: message\|doc\|url, ref\_id), created\_at, updated\_at, expires\_at?
    * **Decision**: id, project\_id, title, description, decided\_at, source\_ref
    * **Link**: id, from\_entity(type,id), to\_entity(type,id), kind(cause\|analogy\|temporal\|refines\|contradicts\|depends), weight(0..1), created\_at
    * **Artifact**: id, project\_id, kind(doc\|note\|file\|dataset\|web), ref, title, summary, created\_at
    * **Source**: id, kind(message\|doc\|url), ref\_id, quote?, author?, date?
    * **Snapshot**: id, project\_id, built\_at, mission, facts\[\], decisions\[\], timeline\[\], open\_questions\[\], citations\[\], budget\_tokens, version
    * **KnowledgeChunk**: id, project\_id?, corpus\_id, doc\_id, chunk, embedding, meta(author,date,authority), created\_at
* **2) Связи (основные)**
    * Project 1—N Thread, Artifact, Fact, Decision, Snapshot
    * Thread 1—N Message
    * Fact/Decision/Artifact → Source (1—N)
    * Link: (entity↔entity) где entity ∈ \{Fact, Decision, Artifact, Thread, Snapshot\}
    * KnowledgeChunk: \{внешний корпус\}↔Project (опционально через слой прав доступа)
* **3) Индексы и доступ**
    * Поиск по [Project.id](http://project.id/), по времени, по subject/keywords.
    * Фильтры: by\_project, by\_entity, by\_recency, by\_authority.
    * Версионность Snapshot (immutable записи с built\_at).
* **4) Политики данных (логический уровень)**
    * No‑source → не пишем Fact в долговременную память.
    * Probation: непроверенные факты помечаются level=hypothesis до подтверждения.
    * Конфликты: коэкзистируют как противоречащие записи, Link(kind=contradicts); изменение требует подтверждения.
    * Решения: новое решение помечает прежнее как superseded (через Link(kind=refines) + status).
* **5) Представления (views) для сборки снапшота**
    * v\_project\_mission: project.mission + goals + constraints
    * v\_recent\_decisions: последние N решений по времени/важности
    * v\_relevant\_facts(project\_id, entities\[\], recency\_window): факты с источниками
    * v\_conflicts(project\_id): пары Fact/Decision с Link.kind=contradicts
    * v\_timeline: упорядоченные Thread/Message/Decision
* **6) Мини‑схемы JSON в полях**
    * Fact.value: допускает atomic\|string\|json (для сложных структур)
    * Snapshot.facts\[\]: \{fact\_id, subject, value, source\_ref\}
    * Snapshot.citations\[\]: \{source\_id, ref\}
* (Диаграмма сущностей‑связей при необходимости будет добавлена отдельно.)
* MaaS — Внутренние процессы (I/O спецификация)

	Формат: **Процесс → Назначение → Вход → Выход → Правила/политики**
    1. NormalizeRequest

	Назначение: определить проект, намерение, сущности, ограничения.

	Вход: user\_query.

	Выход: \{project\_id?, intent, entities\[\], constraints\[\], relevance(in\|out\|mixed)\}.

	Правила: проект‑центричность, минимизация двусмысленности.
    2. UpdateHistory

	Назначение: интегрировать новые сообщения/артефакты; извлечь факты/решения.

	Вход: messages\[\], artifacts\[\].

	Выход: \{facts\[\], decisions\[\], links\[\], open\_questions\[\]\}.

	Политики: no‑source → не писать в долговременную; probation для непроверенного.
    3. BuildSnapshot

	Назначение: собрать актуальный контекст проекта.

	Вход: project\_id, normalized\_request.

	Выход: snapshot\{mission, facts\_with\_refs\[\], decisions\[\], timeline, open\_questions\[\], citations\[\]\}.

	Правила: якоря (must‑preserve), иерархия контекста, прогрессивная детализация, бюджет токенов.
    4. RetrieveKnowledge

	Назначение: дополнить снапшот выдержками из корпуса знаний.

	Вход: normalized\_request, snapshot.

	Выход: knowledge\_items\[\]\{chunk, citation, authority?\}.

	Правила: приоритет по релевантности и свежести; обязательная атрибуция.
    5. ComposeContext

	Назначение: объединить снапшот и знания в «пирог» под бюджет.

	Вход: snapshot, knowledge\_items\[\], token\_budget.

	Выход: context\_bundle\{instructions\[\], mission, facts\[\], decisions\[\], knowledge\[\], constraints\[\], citations\[\]\}.

	Правила: детерминизм; прозрачность уровней знания.
    6. Inference

	Назначение: получить ответ ассистента.

	Вход: context\_bundle.

	Выход: assistant\_answer.

	Правила: ассистент без памяти; результат не является источником без проверки.
    7. WriteBack

	Назначение: зафиксировать новые факты/решения/связи из ответа.

	Вход: assistant\_answer, citations.

	Выход: \{facts\[\], decisions\[\], links\[\], updates\}.

	Политики: no‑source → не писать; конфликт → пометка contradicts + запрос подтверждения.
    8. Monitor

	Назначение: наблюдаемость и метрики.

	Вход: события процессов.

	Выход: метрики\{latency, hit@k, attr\_rate, conflict\_rate, token\_budget\_used\}.

	Правила: логирование и аудит.
* MaaS — Прототип в n8n (пошаговый план)

	**0) Подготовка**
    * Переменные окружения: DB\_URL, OPENAI\_API\_KEY/CLAUDE\_KEY, VECTOR\_DB\_URL, TOKEN\_BUDGET.
    * Таблицы БД: projects, threads, messages, thread\_summaries, thread\_facts, thread\_links, snapshots.
* **1) Поток (high‑level)**
    1. **Webhook Trigger** → входной user\_query.
    2. **Function: NormalizeRequest** → project\_id, intent, entities, constraints, relevance.
    3. **DB: Write Message** → запись сообщения в историю.
    4. **LLM: Summarizer** → обновить thread\_summary + thread\_facts.
    5. **LLM: Linker** → обновить thread\_links внутри проекта.
    6. **Function: BuildSnapshot** → собрать снапшот с якорями и сжатием.
    7. **Vector Search: RetrieveKnowledge** → top‑k выдержки с цитатами.
    8. **Function: ComposeContext** → context\_bundle под TOKEN\_BUDGET.
    9. **LLM: Assistant** → ответ.
    10. **Function: WriteBack** → новые факты/решения/связи.
    11. **Webhook Respond** → вернуть ответ.
* **2) Узлы и форматы**
    * **Summarizer (LLM)**: JSON → \{goals\[\], decisions\[\], facts\[\{subject,value,level,source\_msg\_id\}\], open\_questions\[\], entities\[\]\}.
    * **Linker (LLM)**: JSON → links\[\{from\_thread\_id,to\_thread\_id,kind,weight\}\].
    * **Snapshot (Function)**: вход project\_id, normalized\_request → snapshot\{mission,facts\_with\_refs\[\],decisions\[\],timeline,open\_questions\[\],citations\[\]\}.
    * **RetrieveKnowledge**: вход normalized\_request,snapshot → items\[\{chunk,citation,authority?\}\].
    * **ComposeContext**: вход snapshot,items,TOKEN\_BUDGET → context\_bundle\{instructions\[\],mission,facts\[\],decisions\[\],knowledge\[\],constraints\[\],citations\[\]\}.
* **3) Политики прототипа**
    * Нет источника → факт не попадает в долговременную память.
    * Конфликт → пометка contradicts и запрос уточнения в следующем шаге.
    * Кэш снапшота: 10–15 минут.
* **4) Тест‑план**
    * Набор тестовых тредов (3–5) на проект; проверка включения миссии/решений в снапшот.
    * Проверка attr\_rate=100% для ключевых фактов.
    * Проверка ограничения TOKEN\_BUDGET (принудительное сжатие).
    * Проверка обработки конфликтов (contradicts → уточняющий вопрос).
* **5) Дальнейшие шаги**
    * Добавить метрики (latency, hit@k, attr\_rate, conflict\_rate, token\_budget\_used).
    * Включить прогрессивную детализацию контекста.
    * Ввести «паттерны памяти» для повторяемых задач.
* Точки вызова модели

	Коротко: вот **точки вызова модели** (LLM/эмбеддинги) в нашем пайплайне MaaS — только там, где без неё нельзя или сильно дороже алгоритмами.
    1. NormalizeRequest — LLM

	Задача: извлечь intent, entities, принадлежность к проекту, ограничения.

	Вход: user\_query. Выход: \{intent, entities\[\], project\_binding, constraints\}.

	Промпт: «Классифицируй запрос… верни JSON».
    2. Summarizer (по треду) — LLM

	Задача: саммари + извлечение фактов/решений/вопросов с атрибуцией.

	Вход: полный тред. Выход: summary + facts\[\{subject,value,level,source\_msg\_id\}\], decisions\[\], open\_questions\[\].

	Промпт: «Верни строго JSON со списком…».
    3. Linker (межтредовые связи) — LLM (опц., но желательно)

	Задача: выявить связи (same\_entity / temporal / refines / contradicts).

	Вход: набор thread\_summaries проекта. Выход: links\[\].

	Промпт: «Найди связи между тредами… JSON».
    4. BuildSnapshot: компрессия/иерархия — LLM (для семантического сжатия)

	Задача: собрать «актуальный срез» под бюджет токенов; применять якоря/прогрессивную детализацию.

	Вход: нормализованный запрос + кандидаты фактов/решений/хронологии.

	Выход: snapshot\{mission, facts\_with\_refs\[\], decisions\[\], timeline, open\_questions\[\], citations\[\]\}.

	Промпт: «Собери контекст уровня …, сохрани якоря…, уложись в N токенов…».
    5. Эмбеддинги для RAG — эмбеддинг-модель

	Задача: индексировать корпус знаний и делать векторный поиск.

	Вход: документы / запрос. Выход: top-k chunks.

	(Это не генерация, но вызов модели эмбеддингов.)
    6. RetrieveKnowledge: переформулирование запроса к RAG — LLM (опц.)

	Задача: улучшить/расширить запрос к векторке (query expansion).

	Вход: normalized\_request + snapshot. Выход: расширенный запрос(ы).

	Промпт: «Сформулируй 3 варианта запроса для поиска…».
    7. ComposeContext — LLM (для финальной семантической сборки/сжатия)

	Задача: объединить снапшот + выдержки из базы знаний в «пирог» под лимит токенов, расставить приоритеты.

	Вход: snapshot + RAG-chunks + budget. Выход: context\_bundle.

	Промпт: «Собери инструкции≤8, факты с цитатами, решения… уложись в N…».
    8. Assistant Inference — LLM

	Задача: финальный ответ.

	Вход: context\_bundle. Выход: ответ.
    9. Write-back Extractor — LLM

	Задача: из ответа извлечь новые факты/решения/ссылки и пометки конфликтов.

	Вход: ответ ассистента + context\_bundle. Выход: \{facts\[\], decisions\[\], contradictions?\}.

	Промпт: «Извлеки структурированные факты/решения… JSON; без источника пометь как hypothesis».
    10. Clarifier (при конфликтах/неопределённости) — LLM

	Задача: сгенерировать 1–2 точных уточняющих вопроса пользователю.

	Вход: признаки пробелов/конфликтов. Выход: вопрос(ы).

	Промпт: «Сформулируй краткий уточняющий вопрос…».
* Где **можно без LLM** (алгоритмически):
    * Ранжирование тредов по recency/links/простым правилам.
    * ACL, скоупы, кэш снапшота.
    * Детект «в проекте / вне проекта» при наличии явной метки.
    * Бюджет/обрезка по длине (механически).
* Итого: обязательные вызовы — 1, 2, 4, 5, 7, 8, 9; опционально усиливающие — 3, 6, 10. Если нужно, перенесу это как раздел «LLM touchpoints» в наши документы на канвасе.
