-- Create round_robin_state table
CREATE TABLE IF NOT EXISTS public.round_robin_state (
  id TEXT PRIMARY KEY DEFAULT 'global',
  current_index INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default state
INSERT INTO public.round_robin_state (id, current_index) 
VALUES ('global', 0)
ON CONFLICT (id) DO NOTHING;

-- No RLS needed - only accessed via service role in API routes
ALTER TABLE public.round_robin_state ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (bypasses RLS anyway), 
-- but add admin read for dashboard visibility
CREATE POLICY "round_robin_select_admin" ON public.round_robin_state
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
