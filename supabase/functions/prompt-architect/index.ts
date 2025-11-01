import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Master system prompt for the AI
const SYSTEM_PROMPT = `You are "Prompt Architect", an enterprise-grade senior prompt engineer.

# CORE MISSION
Generate production-ready, battle-tested prompts using a structured methodology.

# INTERVIEWING RULES
1. Ask concise, targeted questions (max 3 per turn)
2. Focus on collecting: Goal, Audience/Channel, Inputs, Output Format, Constraints, Style/Tone, Guardrails
3. Stop asking when you have enough context to generate a high-quality prompt

# PROMPT STRUCTURE (Always follow this skeleton)
# ROLE
[Define the AI's role/persona]

# OBJECTIVE
[Single, measurable goal]

# CONTEXT
[Essential background: audience, channel, tools, constraints]

# INPUT
[What data/information will be provided]

# OUTPUT_FORMAT
[Exact format required - JSON schema if applicable]

# CONSTRAINTS
[Hard limits: length, tone, safety, compliance]

# EXAMPLES (optional)
[If helpful, provide 1-2 examples]

# EXECUTE
[Clear instruction to begin]

# SYNTHESIS RULES
- Use evidence from historical prompts and KB patterns
- Prioritize determinism and reproducibility
- For JSON outputs: specify exact schema, no markdown fences, no commentary
- Include specific constraints rather than vague guidance
- Make it actionable and testable

# GRADING CRITERIA
Self-assess on: Clarity (0-1), Completeness (0-1), Constraint Adherence (0-1), Determinism (0-1), Safety (0-1)
Target: Each score ≥ 0.70, Total ≥ 0.80

# SAFETY
Decline unsafe/unethical requests. Suggest compliant alternatives.`;

// Required fields for prompt generation
const REQUIRED_FIELDS = ["Goal", "Audience", "Inputs", "Output_Format", "Constraints"];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { action, session_id, project_id, user_message, collected = {} } = await req.json();

    // Get user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Handle different actions
    switch (action) {
      case 'interview':
        return await handleInterview(supabaseClient, user.id, session_id, user_message, collected);
      
      case 'generate':
        return await handleGenerate(supabaseClient, user.id, session_id, project_id, user_message, collected);
      
      case 'get_history':
        return await handleGetHistory(supabaseClient, project_id);
      
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Error in prompt-architect function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleInterview(supabaseClient: any, userId: string, sessionId: string, userMessage: string, collected: any) {
  // Check what's missing
  const missing = REQUIRED_FIELDS.filter(field => !collected[field] || collected[field].trim() === '');
  
  // Store user message
  await supabaseClient
    .from('interview_turns')
    .insert({
      session_id: sessionId,
      role: 'user',
      content: userMessage
    });

  if (missing.length > 0) {
    // Generate interview questions using AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: `You are interviewing someone to build a prompt. Ask 1-3 concise questions to collect: ${missing.join(', ')}. Already collected: ${JSON.stringify(collected)}. Be specific and helpful.` },
          { role: 'user', content: userMessage }
        ],
      }),
    });

    const aiData = await response.json();
    const questions = aiData.choices[0].message.content;

    // Store AI response
    await supabaseClient
      .from('interview_turns')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: questions
      });

    return new Response(
      JSON.stringify({ 
        type: 'questions',
        questions,
        missing,
        collected 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ 
      type: 'ready',
      message: 'Ready to generate your prompt!',
      collected 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleGenerate(supabaseClient: any, userId: string, sessionId: string, projectId: string, userMessage: string, collected: any) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  // Step 1: RAG - Search historical prompts and KB
  const query = `${collected.Goal} ${collected.Audience} ${collected.Output_Format}`.trim();
  
  // Search historical prompts (simplified - in production use vector similarity)
  const { data: historicalPrompts } = await supabaseClient
    .from('prompt_records')
    .select('id, synthesized_prompt, total_score, win_rate, features')
    .eq('project_id', projectId)
    .order('total_score', { ascending: false })
    .limit(5);

  // Search KB chunks (simplified - in production use vector similarity)
  const { data: kbChunks } = await supabaseClient
    .from('kb_chunks')
    .select('id, text, metadata')
    .eq('project_id', projectId)
    .limit(5);

  // Build evidence pack
  let evidence = '\n\n--- EVIDENCE FROM KNOWLEDGE BASE ---\n';
  if (historicalPrompts && historicalPrompts.length > 0) {
    evidence += '\nHISTORICAL HIGH-PERFORMING PROMPTS:\n';
    historicalPrompts.forEach((p: any, i: number) => {
      evidence += `\n[${i + 1}] Score: ${p.total_score}, Win Rate: ${p.win_rate}\n${p.synthesized_prompt.substring(0, 500)}...\n`;
    });
  }
  if (kbChunks && kbChunks.length > 0) {
    evidence += '\nKNOWLEDGE BASE PATTERNS:\n';
    kbChunks.forEach((chunk: any, i: number) => {
      evidence += `\n[${i + 1}] ${chunk.text.substring(0, 300)}...\n`;
    });
  }

  // Step 2: Synthesize prompt using AI
  const synthesisResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { 
          role: 'user', 
          content: `Generate a production-ready prompt with this information:\n\nGOAL: ${collected.Goal}\nAUDIENCE: ${collected.Audience}\nINPUTS: ${collected.Inputs}\nOUTPUT FORMAT: ${collected.Output_Format}\nCONSTRAINTS: ${collected.Constraints}\nSTYLE/TONE: ${collected.Style || 'Professional'}\nGUARDRAILS: ${collected.Guardrails || 'Standard safety guidelines'}${evidence}\n\nFollow the exact structure: ROLE → OBJECTIVE → CONTEXT → INPUT → OUTPUT_FORMAT → CONSTRAINTS → EXECUTE` 
        }
      ],
    }),
  });

  const synthesisData = await synthesisResponse.json();
  const synthesizedPrompt = synthesisData.choices[0].message.content;

  // Step 3: Grade the prompt
  const gradingResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { 
          role: 'system', 
          content: 'You are a prompt quality assessor. Rate the prompt on: Clarity, Completeness, Constraint_Adherence, Determinism, Safety. Return ONLY a JSON object with scores 0-1 for each criterion and a total score. Format: {"Clarity": 0.9, "Completeness": 0.85, "Constraint_Adherence": 0.9, "Determinism": 0.8, "Safety": 1.0, "total": 0.87}' 
        },
        { 
          role: 'user', 
          content: `Grade this prompt:\n\n${synthesizedPrompt}\n\nRequired format: ${collected.Output_Format}\nConstraints: ${collected.Constraints}` 
        }
      ],
    }),
  });

  const gradingData = await gradingResponse.json();
  let scores = { Clarity: 0.85, Completeness: 0.85, Constraint_Adherence: 0.85, Determinism: 0.80, Safety: 0.95, total: 0.86 };
  
  try {
    const gradingText = gradingData.choices[0].message.content;
    const jsonMatch = gradingText.match(/\{[^}]+\}/);
    if (jsonMatch) {
      scores = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Error parsing grades:', e);
  }

  // Step 4: Refine if needed
  let finalPrompt = synthesizedPrompt;
  if (scores.total < 0.80 || Object.values(scores).some((v: any) => typeof v === 'number' && v < 0.70)) {
    const refinementResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: `This prompt scored ${scores.total}. Refine it to score ≥0.80:\n\n${synthesizedPrompt}\n\nScores: ${JSON.stringify(scores)}\n\nMaintain the structure but improve clarity, completeness, and determinism.` 
          }
        ],
      }),
    });

    const refinementData = await refinementResponse.json();
    finalPrompt = refinementData.choices[0].message.content;

    // Re-grade
    const regradeResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are a prompt quality assessor. Rate the prompt on: Clarity, Completeness, Constraint_Adherence, Determinism, Safety. Return ONLY a JSON object with scores 0-1 for each criterion and a total score.' 
          },
          { 
            role: 'user', 
            content: `Grade this refined prompt:\n\n${finalPrompt}` 
          }
        ],
      }),
    });

    const regradeData = await regradeResponse.json();
    try {
      const regradeText = regradeData.choices[0].message.content;
      const jsonMatch = regradeText.match(/\{[^}]+\}/);
      if (jsonMatch) {
        scores = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Error parsing regrade:', e);
    }
  }

  // Step 5: Store the prompt
  const { data: promptRecord, error: storeError } = await supabaseClient
    .from('prompt_records')
    .insert({
      project_id: projectId,
      user_question: userMessage,
      synthesized_prompt: finalPrompt,
      references: {
        historical_prompts: (historicalPrompts || []).map((p: any) => p.id),
        kb_chunks: (kbChunks || []).map((c: any) => c.id)
      },
      rubric_scores: scores,
      total_score: scores.total,
      output_format: collected.Output_Format,
      model_used: 'prompt-architect-ce',
      features: collected
    })
    .select()
    .single();

  if (storeError) {
    console.error('Error storing prompt:', storeError);
  }

  // Link interview turns to prompt record
  if (promptRecord) {
    await supabaseClient
      .from('interview_turns')
      .update({ prompt_record_id: promptRecord.id })
      .eq('session_id', sessionId);
  }

  return new Response(
    JSON.stringify({
      type: 'generated',
      prompt: finalPrompt,
      scores,
      id: promptRecord?.id,
      references: {
        historical_count: historicalPrompts?.length || 0,
        kb_count: kbChunks?.length || 0
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleGetHistory(supabaseClient: any, projectId: string) {
  const { data: prompts, error } = await supabaseClient
    .from('prompt_records')
    .select('id, user_question, synthesized_prompt, total_score, win_rate, output_format, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;

  return new Response(
    JSON.stringify({ prompts }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}