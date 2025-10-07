/*
  # Add memory field to personalities table

  1. Schema Changes
    - Add `has_memory` boolean field to `personalities` table
    - Set default value to `true` (memory enabled by default)
    - Update existing records to have memory enabled

  2. Security
    - No changes to RLS policies needed (existing policies cover new field)
*/

-- Add memory field to personalities table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'personalities' AND column_name = 'has_memory'
  ) THEN
    ALTER TABLE personalities ADD COLUMN has_memory boolean DEFAULT true;
  END IF;
END $$;

-- Update existing records to have memory enabled by default
UPDATE personalities SET has_memory = true WHERE has_memory IS NULL;