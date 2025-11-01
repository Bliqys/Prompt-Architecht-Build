-- Enable pgvector extension for similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Default Project',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_projects_user_id ON public.projects(user_id);

-- Create kb_chunks table for knowledge base
CREATE TABLE public.kb_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kb_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view kb_chunks for their projects"
  ON public.kb_chunks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = kb_chunks.project_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can create kb_chunks for their projects"
  ON public.kb_chunks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = kb_chunks.project_id
    AND projects.user_id = auth.uid()
  ));

CREATE INDEX idx_kb_chunks_project_id ON public.kb_chunks(project_id);

-- Create prompt_records table
CREATE TABLE public.prompt_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL,
  metadata JSONB,
  scores JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prompt_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view prompt_records for their projects"
  ON public.prompt_records FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = prompt_records.project_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can create prompt_records for their projects"
  ON public.prompt_records FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = prompt_records.project_id
    AND projects.user_id = auth.uid()
  ));

CREATE INDEX idx_prompt_records_project_id ON public.prompt_records(project_id);

-- Create interview_turns table
CREATE TABLE public.interview_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  turn_number INTEGER NOT NULL,
  user_message TEXT,
  ai_message TEXT,
  collected JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.interview_turns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view interview_turns for their projects"
  ON public.interview_turns FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = interview_turns.project_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can create interview_turns for their projects"
  ON public.interview_turns FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = interview_turns.project_id
    AND projects.user_id = auth.uid()
  ));

CREATE INDEX idx_interview_turns_project_id ON public.interview_turns(project_id);
CREATE INDEX idx_interview_turns_session_id ON public.interview_turns(session_id);

-- Create prompt_outcomes table
CREATE TABLE public.prompt_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_record_id UUID NOT NULL REFERENCES public.prompt_records(id) ON DELETE CASCADE,
  outcome TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prompt_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view prompt_outcomes for their prompts"
  ON public.prompt_outcomes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.prompt_records pr
    JOIN public.projects p ON p.id = pr.project_id
    WHERE pr.id = prompt_outcomes.prompt_record_id
    AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can create prompt_outcomes for their prompts"
  ON public.prompt_outcomes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.prompt_records pr
    JOIN public.projects p ON p.id = pr.project_id
    WHERE pr.id = prompt_outcomes.prompt_record_id
    AND p.user_id = auth.uid()
  ));

CREATE INDEX idx_prompt_outcomes_prompt_record_id ON public.prompt_outcomes(prompt_record_id);