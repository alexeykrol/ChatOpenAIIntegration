-- Migration: Add JSONB files support to personalities table
-- Date: 2025-01-31
-- Purpose: Replace single file fields with JSONB array for multiple files

-- Add temporary JSONB column for files
ALTER TABLE personalities ADD COLUMN IF NOT EXISTS temp_files JSONB DEFAULT '[]';