-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conversation_messages table
CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add conversation_id to prompt_records
ALTER TABLE public.prompt_records 
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view their own conversations"
ON public.conversations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations"
ON public.conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
ON public.conversations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
ON public.conversations FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for conversation_messages
CREATE POLICY "Users can view messages in their conversations"
ON public.conversation_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = conversation_messages.conversation_id
    AND conversations.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create messages in their conversations"
ON public.conversation_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = conversation_messages.conversation_id
    AND conversations.user_id = auth.uid()
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_project_id ON public.conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_id ON public.conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_prompt_records_conversation_id ON public.prompt_records(conversation_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_conversations_updated_at();