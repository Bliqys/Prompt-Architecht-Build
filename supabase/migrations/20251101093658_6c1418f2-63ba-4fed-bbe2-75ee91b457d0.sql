-- Fix kb_chunks table structure to match edge function expectations
ALTER TABLE public.kb_chunks 
  DROP COLUMN IF EXISTS content,
  ADD COLUMN IF NOT EXISTS text TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS chunk_index INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source_name TEXT;

-- Add RLS policies for kb_chunks
ALTER TABLE public.kb_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their project's KB chunks"
  ON public.kb_chunks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = kb_chunks.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert KB chunks to their projects"
  ON public.kb_chunks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = kb_chunks.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their project's KB chunks"
  ON public.kb_chunks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = kb_chunks.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Fix prompt_records to have proper columns
ALTER TABLE public.prompt_records 
  ADD COLUMN IF NOT EXISTS synthesized_prompt TEXT,
  ADD COLUMN IF NOT EXISTS total_score NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS win_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}'::jsonb;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_kb_chunks_project_id ON public.kb_chunks(project_id);
CREATE INDEX IF NOT EXISTS idx_prompt_records_project_id ON public.prompt_records(project_id);