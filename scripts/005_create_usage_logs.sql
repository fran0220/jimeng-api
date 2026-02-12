-- Create usage_logs table for request tracking
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  upstream_token_id UUID REFERENCES public.upstream_tokens(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INT,
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  response_time_ms INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_usage_logs_rate_limit
  ON public.usage_logs (api_key_id, created_at DESC);

-- Index for user usage queries
CREATE INDEX IF NOT EXISTS idx_usage_logs_user
  ON public.usage_logs (user_id, created_at DESC);

ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Users can read their own logs
CREATE POLICY "usage_logs_select_own" ON public.usage_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can read all logs
CREATE POLICY "usage_logs_select_admin" ON public.usage_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
