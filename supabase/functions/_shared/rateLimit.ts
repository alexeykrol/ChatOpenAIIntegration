import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Check and enforce rate limiting for a user
 * @param userId - User ID to check
 * @param supabaseUrl - Supabase project URL
 * @param supabaseKey - Supabase service key
 * @param limit - Requests allowed per window (default: 60)
 * @param windowSeconds - Time window in seconds (default: 60)
 */
export async function checkRateLimit(
  userId: string,
  supabaseUrl: string,
  supabaseKey: string,
  limit: number = 60,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Call rate limit check function
  const { data, error } = await supabase.rpc('check_and_increment_rate_limit', {
    p_user_id: userId,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error('Rate limit check failed:', error);
    // Fail open (allow request) if rate limit check fails
    return {
      allowed: true,
      remaining: limit,
      resetAt: new Date(Date.now() + windowSeconds * 1000),
    };
  }

  return {
    allowed: data.allowed,
    remaining: data.remaining,
    resetAt: new Date(data.reset_at),
  };
}
