-- Миграция 004: Добавление полей саммаризации в personalities
-- Цель: Привязать настройки саммаризации к конкретной личности вместо глобальных настроек
-- Дата: 2025-01-31

-- 1. Добавляем поля саммаризации в personalities
ALTER TABLE personalities 
ADD COLUMN summarization_enabled BOOLEAN DEFAULT false,
ADD COLUMN summarization_model TEXT DEFAULT 'gpt-3.5-turbo',
ADD COLUMN summarization_prompt TEXT DEFAULT 'You are a helpful assistant that creates concise summaries of conversations. 

Focus on:
- Key facts and decisions made
- Important context and background information
- Action items and todos mentioned
- Goals and constraints discussed
- Technical details and specifications

Keep summaries accurate and concise while preserving essential information.';

-- 2. Комментарии для новых полей
COMMENT ON COLUMN personalities.summarization_enabled IS 'Включена ли саммаризация для данной личности';
COMMENT ON COLUMN personalities.summarization_model IS 'Модель LLM для саммаризации (gpt-3.5-turbo, gpt-4o-mini, gpt-4o)';
COMMENT ON COLUMN personalities.summarization_prompt IS 'Промпт для инструкций саммаризации';

-- 3. Создаем индекс для быстрого поиска личностей с включенной саммаризацией
CREATE INDEX idx_personalities_summarization_enabled 
ON personalities(user_id, summarization_enabled) 
WHERE summarization_enabled = true;

-- 4. Создаем триггер updated_at (если не существует, будет ошибка - это нормально)
CREATE TRIGGER update_personalities_updated_at
    BEFORE UPDATE ON personalities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Устанавливаем значения по умолчанию для существующих записей
-- Для личностей с has_memory = true включаем саммаризацию
UPDATE personalities 
SET summarization_enabled = true
WHERE has_memory = true;

-- 6. Проверочный запрос для верификации
-- SELECT name, has_memory, summarization_enabled, summarization_model 
-- FROM personalities 
-- WHERE user_id = auth.uid();