-- Create upstream tokens table for admin token pool
CREATE TABLE IF NOT EXISTS public.upstream_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL,
  label TEXT,
  is_active BOOLEAN DEFAULT true,
  priority INT DEFAULT 0,
  total_requests BIGINT DEFAULT 0,
  total_failures BIGINT DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.upstream_tokens ENABLE ROW LEVEL SECURITY;

-- Only admins can manage upstream tokens
CREATE POLICY "upstream_tokens_select_admin" ON public.upstream_tokens
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "upstream_tokens_insert_admin" ON public.upstream_tokens
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "upstream_tokens_update_admin" ON public.upstream_tokens
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "upstream_tokens_delete_admin" ON public.upstream_tokens
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
