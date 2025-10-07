-- Migration: Add rate limiting
-- Purpose: Prevent API abuse and DDoS attacks
-- Date: 2025-10-06

-- Create rate limiting table
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  request_count INTEGER DEFAULT 0 NOT NULL,
  window_start TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add comment
COMMENT ON TABLE public.api_rate_limits IS 'Rate limiting for API requests per user';

-- Enable RLS
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own rate limits"
  ON public.api_rate_limits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage rate limits"
  ON public.api_rate_limits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_id ON public.api_rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON public.api_rate_limits(window_start);

-- Function to check and increment rate limit
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 60,
  p_window_seconds INTEGER DEFAULT 60
)
RETURNS TABLE(allowed BOOLEAN, remaining INTEGER, reset_at TIMESTAMPTZ) AS $$
DECLARE
  v_current_count INTEGER;
  v_current_window TIMESTAMPTZ;
  v_window_age INTERVAL;
  v_new_window_start TIMESTAMPTZ;
BEGIN
  -- Get current rate limit data
  SELECT request_count, window_start
  INTO v_current_count, v_current_window
  FROM public.api_rate_limits
  WHERE user_id = p_user_id;

  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.api_rate_limits (user_id, request_count, window_start)
    VALUES (p_user_id, 1, NOW())
    ON CONFLICT (user_id) DO NOTHING;

    RETURN QUERY SELECT
      TRUE AS allowed,
      p_limit - 1 AS remaining,
      (NOW() + (p_window_seconds || ' seconds')::INTERVAL) AS reset_at;
    RETURN;
  END IF;

  -- Calculate window age
  v_window_age := NOW() - v_current_window;

  -- If window has expired, reset counter
  IF v_window_age > (p_window_seconds || ' seconds')::INTERVAL THEN
    UPDATE public.api_rate_limits
    SET
      request_count = 1,
      window_start = NOW(),
      updated_at = NOW()
    WHERE user_id = p_user_id;

    RETURN QUERY SELECT
      TRUE AS allowed,
      p_limit - 1 AS remaining,
      (NOW() + (p_window_seconds || ' seconds')::INTERVAL) AS reset_at;
    RETURN;
  END IF;

  -- Check if limit exceeded
  IF v_current_count >= p_limit THEN
    RETURN QUERY SELECT
      FALSE AS allowed,
      0 AS remaining,
      (v_current_window + (p_window_seconds || ' seconds')::INTERVAL) AS reset_at;
    RETURN;
  END IF;

  -- Increment counter
  UPDATE public.api_rate_limits
  SET
    request_count = request_count + 1,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT
    TRUE AS allowed,
    (p_limit - v_current_count - 1) AS remaining,
    (v_current_window + (p_window_seconds || ' seconds')::INTERVAL) AS reset_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(UUID, INTEGER, INTEGER) TO service_role;

-- Add comment
COMMENT ON FUNCTION public.check_and_increment_rate_limit IS
'Checks rate limit and increments counter. Returns: allowed (bool), remaining (int), reset_at (timestamp)';

-- Create cleanup function to remove old rate limit records
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete rate limit records older than 24 hours
  DELETE FROM public.api_rate_limits
  WHERE window_start < NOW() - INTERVAL '24 hours';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.cleanup_old_rate_limits IS
'Removes rate limit records older than 24 hours. Run this periodically via cron.';

-- Note: Set up a cron job in Supabase dashboard to run cleanup_old_rate_limits() daily
-- Example: SELECT cron.schedule('cleanup-rate-limits', '0 2 * * *', 'SELECT cleanup_old_rate_limits()');

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Rate limiting migration applied successfully';
  RAISE NOTICE 'Table created: api_rate_limits';
  RAISE NOTICE 'Function created: check_and_increment_rate_limit()';
  RAISE NOTICE 'Function created: cleanup_old_rate_limits()';
  RAISE NOTICE 'Default limit: 60 requests per 60 seconds';
END $$;
