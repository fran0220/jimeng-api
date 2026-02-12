-- Create api_keys table for user-generated keys
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Default Key',
  is_active BOOLEAN DEFAULT true,
  rate_limit INT DEFAULT 10,
  quota_limit BIGINT DEFAULT 1000,
  quota_used BIGINT DEFAULT 0,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Users can manage their own keys
CREATE POLICY "api_keys_select_own" ON public.api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "api_keys_insert_own" ON public.api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "api_keys_update_own" ON public.api_keys
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "api_keys_delete_own" ON public.api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- Admins can read all keys
CREATE POLICY "api_keys_select_admin" ON public.api_keys
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Admins can update all keys
CREATE POLICY "api_keys_update_admin" ON public.api_keys
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
