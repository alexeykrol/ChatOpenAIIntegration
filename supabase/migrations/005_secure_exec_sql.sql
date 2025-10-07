-- Migration: Secure exec_sql function
-- Purpose: Remove or restrict the dangerous exec_sql function
-- Date: 2025-10-06
-- Security Fix: CRITICAL - SQL Injection vulnerability

-- OPTION 1: Drop the function entirely (RECOMMENDED)
-- Uncomment this to completely remove exec_sql:
-- DROP FUNCTION IF EXISTS public.exec_sql(text);

-- OPTION 2: Secure the function with strict access control
-- This version can only be used by service role, not by users
DROP FUNCTION IF EXISTS public.exec_sql(text);

CREATE OR REPLACE FUNCTION public.exec_sql_admin(sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Security check: Only allow migrations from service role
  -- Regular authenticated users cannot call this function
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: exec_sql_admin requires service_role';
  END IF;

  -- Whitelist allowed operations (DDL only, no DML)
  IF sql !~* '^(CREATE|ALTER|DROP)\s+(TABLE|INDEX|FUNCTION|TRIGGER|TYPE|VIEW)' THEN
    RAISE EXCEPTION 'Only DDL operations (CREATE/ALTER/DROP) allowed';
  END IF;

  -- Blacklist dangerous operations
  IF sql ~* '(DROP\s+DATABASE|DROP\s+SCHEMA|GRANT|REVOKE|SECURITY\s+DEFINER)' THEN
    RAISE EXCEPTION 'Dangerous operation not allowed';
  END IF;

  -- Execute and return result
  EXECUTE sql;

  result := jsonb_build_object(
    'success', true,
    'message', 'SQL executed successfully',
    'timestamp', now()
  );

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'timestamp', now()
    );
END;
$$;

-- Grant execution only to service role
REVOKE ALL ON FUNCTION public.exec_sql_admin(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.exec_sql_admin(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql_admin(text) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.exec_sql_admin(text) IS
'SECURITY: This function can only be called by service_role for migrations. Regular users cannot access it.';

-- Audit: Log this security change
DO $$
BEGIN
  RAISE NOTICE 'Security fix applied: exec_sql function secured/removed';
  RAISE NOTICE 'Date: %', now();
  RAISE NOTICE 'Only service_role can now execute admin SQL operations';
END $$;
