-- Move pgvector extension to extensions schema (best practice)
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Add missing foreign key relationship for interview_turns
ALTER TABLE public.interview_turns 
ADD COLUMN IF NOT EXISTS prompt_record_id uuid REFERENCES public.prompt_records(id) ON DELETE SET NULL;