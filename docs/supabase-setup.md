# Supabase Setup for Gnosis

Run these SQL commands in your Supabase Dashboard under **SQL Editor**.

---

## 1. Account Deletion Function

Allows users to delete their own account and all associated data.

```sql
-- Function to delete user account (called from client)
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  -- Get the current user's ID
  _user_id := auth.uid();

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete user's data from all tables (add your tables here)
  -- DELETE FROM documents WHERE user_id = _user_id;
  -- DELETE FROM chat_sessions WHERE user_id = _user_id;
  -- DELETE FROM usage_logs WHERE user_id = _user_id;

  -- Delete the user from auth.users (this cascades to profiles if set up)
  DELETE FROM auth.users WHERE id = _user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;
```

---

## 2. Usage Tracking Table

Track API usage per user to monitor and prevent abuse.

```sql
-- Create usage_logs table
CREATE TABLE IF NOT EXISTS usage_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  tokens_used integer DEFAULT 0,
  cost_cents integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create index for fast user queries
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);

-- Enable RLS
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own usage
CREATE POLICY "Users can view own usage" ON usage_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Only the backend can insert usage logs (service role)
CREATE POLICY "Service role can insert usage" ON usage_logs
  FOR INSERT WITH CHECK (true);

-- Create daily usage summary view
CREATE OR REPLACE VIEW user_usage_summary AS
SELECT
  user_id,
  date_trunc('day', created_at)::date as date,
  COUNT(*) as request_count,
  SUM(tokens_used) as total_tokens,
  SUM(cost_cents) as total_cost_cents
FROM usage_logs
GROUP BY user_id, date_trunc('day', created_at)::date;
```

---

## 3. Monthly Usage Limits (Optional)

Add usage limits per user.

```sql
-- Create user_limits table
CREATE TABLE IF NOT EXISTS user_limits (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  monthly_token_limit integer DEFAULT 100000,
  monthly_request_limit integer DEFAULT 1000,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE user_limits ENABLE ROW LEVEL SECURITY;

-- Users can view their own limits
CREATE POLICY "Users can view own limits" ON user_limits
  FOR SELECT USING (auth.uid() = user_id);

-- Function to get current month usage
CREATE OR REPLACE FUNCTION get_current_month_usage()
RETURNS TABLE (
  request_count bigint,
  total_tokens bigint,
  monthly_request_limit integer,
  monthly_token_limit integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  _user_id := auth.uid();

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(ul.tokens_used), 0)::bigint as total_tokens,
    COUNT(ul.id)::bigint as request_count,
    COALESCE(lim.monthly_request_limit, 1000) as monthly_request_limit,
    COALESCE(lim.monthly_token_limit, 100000) as monthly_token_limit
  FROM usage_logs ul
  LEFT JOIN user_limits lim ON lim.user_id = _user_id
  WHERE ul.user_id = _user_id
    AND ul.created_at >= date_trunc('month', now())
  GROUP BY lim.monthly_request_limit, lim.monthly_token_limit;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_current_month_usage() TO authenticated;
```

---

## 4. Insert Default Limits Trigger

Automatically create limits for new users.

```sql
-- Trigger to create default limits for new users
CREATE OR REPLACE FUNCTION create_default_user_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_limits (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_limits ON auth.users;
CREATE TRIGGER on_auth_user_created_limits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_user_limits();
```

---

## Quick Setup (All-in-One)

Copy and run this entire block to set up everything:

```sql
-- ============================================
-- GNOSIS DATABASE SETUP
-- ============================================

-- 1. Account Deletion Function
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  DELETE FROM auth.users WHERE id = _user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;

-- 2. Usage Logs Table
CREATE TABLE IF NOT EXISTS usage_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  tokens_used integer DEFAULT 0,
  cost_cents integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own usage" ON usage_logs FOR SELECT USING (auth.uid() = user_id);

-- 3. User Limits Table
CREATE TABLE IF NOT EXISTS user_limits (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  monthly_token_limit integer DEFAULT 100000,
  monthly_request_limit integer DEFAULT 1000,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE user_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own limits" ON user_limits FOR SELECT USING (auth.uid() = user_id);

-- 4. Get Current Month Usage Function
CREATE OR REPLACE FUNCTION get_current_month_usage()
RETURNS TABLE (
  request_count bigint,
  total_tokens bigint,
  monthly_request_limit integer,
  monthly_token_limit integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(ul.id)::bigint as request_count,
    COALESCE(SUM(ul.tokens_used), 0)::bigint as total_tokens,
    COALESCE(lim.monthly_request_limit, 1000) as monthly_request_limit,
    COALESCE(lim.monthly_token_limit, 100000) as monthly_token_limit
  FROM usage_logs ul
  FULL OUTER JOIN user_limits lim ON lim.user_id = _user_id
  WHERE ul.user_id = _user_id
    AND ul.created_at >= date_trunc('month', now())
  GROUP BY lim.monthly_request_limit, lim.monthly_token_limit;
END;
$$;
GRANT EXECUTE ON FUNCTION get_current_month_usage() TO authenticated;

-- 5. Auto-create limits for new users
CREATE OR REPLACE FUNCTION create_default_user_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_limits (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_limits ON auth.users;
CREATE TRIGGER on_auth_user_created_limits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_user_limits();
```
