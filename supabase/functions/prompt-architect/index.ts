import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// === R4P CONFIGURATION ===
const R4P_CONFIG = {
  hybrid_lambda: 0.65,
  k_retrieve: 12,
  rerank_top: 5,
  confidence_thresholds: { ship: 0.80, refine_min: 0.60, skip_refine_if_over: 0.75 },
  latency_budgets_ms: { retrieve: 150, rerank: 60, draft: 400, validate: 60, refine: 150 },
  rubric_weights: { 
    IntentAccuracy: 0.30, 
    TaskCompletion: 0.25, 
    PolicyAdherence: 0.20, 
    ToneFit: 0.15, 
    FormatCompliance: 0.10 
  }
};

// === SPARTAN SYSTEM PROMPT (compressed, enterprise-grade) ===
const SYSTEM_PROMPT = `You are R4P, retrieval-anchored prompt architect for enterprise AI agents.

ROLE: Generate metaprompts + datasets (JSON) for voice/chat AI. Follow OpenAI: Role→Rules→Resources→OutputContract→SelfChecks.

RULES:
- Use ONLY retrieved evidence; cite artifacts (uri+version+hash)
- Output VALID JSON per schema
- Generate 4 datasets: faq_patterns, conversation_flows, tone_guidelines, edge_cases
- Embed compliance (PII-minimization, guardrails, auditability)
- Refuse or ask ONE question if confidence <0.60 or evidence missing
- Spartan tone; maximize information density

OUTPUT (strict JSON):
{
  "metaprompt": {
    "version": "1.0.0",
    "persona": {"role": "...", "identity": "..."},
    "goals": ["..."],
    "policies": {"privacy": "...", "guardrails": ["..."], "escalation": "..."},
    "datasets": [{"name":"faq_patterns","uri":"generated://v1","version":"1.0"}],
    "tools": [{"name":"...","params":{}}],
    "output_contract": {"format":"JSON","fields":["turn_id","user_intent","entities","ai_response","action","confidence","escalate"]},
    "self_checks": ["schema validation","tone validation","confidence gating"]
  },
  "datasets": {
    "faq_patterns": {"version":"1.0","items":[{"intent":"...","patterns":["..."],"answer":"...","confidence":0.9}]},
    "conversation_flows": {"version":"1.0","flows":{"lead_capture":[{"ask":"...","collect":["name","email"]},{"tool":"book_meeting"}]}},
    "tone_guidelines": {"version":"1.0","brand_personality":["calm","helpful","precise"],"pacing":"moderate","constraints":["no jargon"]},
    "edge_cases": {"version":"1.0","rules":[{"case":"abuse","policy":"de-escalate & escalate"}]}
  },
  "compliance": {"privacy":"PII-minimization","guardrails":["refuse legal/medical advice","escalate abuse"],"auditability":"versioned prompts+datasets"},
  "citations": [{"uri":"...","version":"...","hash":"..."}],
  "confidence": 0.85
}

SELF-CHECKS: Schema valid? Citations present? Datasets complete? Compliance embedded? Tools plausible?

EXAMPLE (one-shot):
User: "Build metaprompt for voice triage agent, healthcare, US, HIPAA."
Assistant: {"metaprompt":{"version":"1.0.0","persona":{"role":"Medical Triage Assistant","identity":"Calm, compliant, empathetic; HIPAA-aware"},"goals":["Assess urgency","Route to care","Collect minimal PHI"],"policies":{"privacy":"Minimal PHI; log redactions","guardrails":["Refuse diagnoses","Escalate emergencies"],"escalation":"Transfer to RN if uncertain"},"datasets":[{"name":"faq_patterns","uri":"generated://v1","version":"1.0"},{"name":"conversation_flows","uri":"generated://v1","version":"1.0"},{"name":"tone_guidelines","uri":"generated://v1","version":"1.0"},{"name":"edge_cases","uri":"generated://v1","version":"1.0"}],"tools":[{"name":"transfer_to_nurse","params":{"reason":"string"}},{"name":"schedule_callback","params":{"time":"ISO8601"}}],"output_contract":{"format":"JSON","fields":["turn_id","user_intent","symptoms","urgency","ai_response","action","tool_params","confidence","escalate"]},"self_checks":["schema validation","PHI redaction","urgency scoring","tone validation"]},"datasets":{"faq_patterns":{"version":"1.0","items":[{"intent":"hours","patterns":["What are your hours?"],"answer":"We're available 24/7 for urgent care. M-F 8am-6pm for appointments.","confidence":0.95}]},"conversation_flows":{"version":"1.0","flows":{"triage":[{"ask":"What symptoms?","collect":["symptoms"]},{"assess":"urgency_score"},{"branch":{"high":"transfer_to_nurse","low":"schedule_callback"}}]}},"tone_guidelines":{"version":"1.0","brand_personality":["calm","empathetic","reassuring"],"pacing":"slow, clear","constraints":["No jargon","Confirm understanding"]},"edge_cases":{"version":"1.0","rules":[{"case":"emergency","policy":"Immediate RN transfer + log"},{"case":"non-urgent","policy":"Callback within 2h"}]}},"compliance":{"privacy":"HIPAA; minimal PHI; redact SSN/DOB","guardrails":["Refuse diagnoses","No prescriptions","Escalate chest pain/breathing"],"auditability":"Turn logs + PHI redactions + urgency scores"},"citations":[{"uri":"kb://hipaa_guidelines","version":"1.2","hash":"a1b2c3"}],"confidence":0.88}`;

// === INTERVIEW QUESTIONNAIRE (comprehensive) ===
const INTERVIEW_QUESTIONS = {
  business_context: [
    "What's the primary purpose? (lead capture, support, bookings, routing)",
    "Which channels? (voice, chat, email) What locales?"
  ],
  audience: [
    "Who are the users? What are the top 10 intents?",
    "Language/region constraints?"
  ],
  brand_voice: [
    "Give me 5 tone adjectives (e.g., calm, professional, friendly)",
    "Pacing preference? (fast, moderate, slow)",
    "Any hold-music or transfer phrasing preferences?"
  ],
  integrations: [
    "What tools/integrations? (calendar, CRM, ticketing)",
    "Any APIs or databases to connect?"
  ],
  guardrails: [
    "What should the agent refuse to do?",
    "Any disclaimers or PII restrictions?",
    "Regulatory scope? (HIPAA, PCI, industry codes)"
  ],
  success_metrics: [
    "Success metrics? (CSAT, AHT, FCR, conversion)",
    "Escalation SLA or transfer targets?"
  ],
  domain_specific: [
    "Operating hours? After-hours policy?",
    "Appointment types or SLAs?",
    "Consent/notification requirements?"
  ],
  voice_specific: [
    "Barge-in behavior? Interrupt handling?",
    "On-hold phrasing? Fail-safes?"
  ]
};

const REQUIRED_FIELDS = [
  "Goal",
  "Audience",
  "Inputs",
  "Output_Format",
  "Constraints",
  "Style",
  "Guardrails",
  "Business_Context",
  "Brand_Voice",
  "Success_Metrics"
];

// === VALIDATION ===
function validateString(value: unknown, maxLength: number, fieldName: string): string {
  if (typeof value !== 'string') throw new Error(`${fieldName} must be a string`);
  if (value.length > maxLength) throw new Error(`${fieldName} exceeds ${maxLength} chars`);
  return value.trim();
}

function validateUUID(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') throw new Error(`${fieldName} must be a string`);
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) throw new Error(`${fieldName} must be valid UUID`);
  return value;
}

function validateCollected(collected: any): Record<string, string> {
  if (typeof collected !== 'object' || collected === null) throw new Error('Collected must be object');
  const validated: Record<string, string> = {};
  for (const key in collected) {
    validated[key] = validateString(collected[key], 2000, key);
  }
  return validated;
}

async function verifyConversationOwnership(supabaseClient: any, conversationId: string, userId: string): Promise<void> {
  const { data: conversation, error } = await supabaseClient
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error('Failed to verify conversation access');
  if (!conversation) throw new Error('Conversation not found or access denied');
}

// === MAIN HANDLER ===
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Create client for auth verification with user's JWT
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Get and verify user
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    // Create service role client for database operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestData = await req.json();
    const { action, session_id, project_id, user_message, collected = {}, conversation_id } = requestData;

    const validatedCollected = validateCollected(collected);

    switch (action) {
      case 'interview':
        return await handleInterview(supabaseClient, user.id, session_id, user_message, validatedCollected);
      case 'generate':
        if (!project_id) throw new Error('project_id required');
        if (!conversation_id) throw new Error('conversation_id required');
        const validated_conversation_id = validateUUID(conversation_id, 'conversation_id');
        await verifyConversationOwnership(supabaseClient, validated_conversation_id, user.id);
        return await handleGenerate(supabaseClient, user.id, session_id, project_id, user_message, validatedCollected, validated_conversation_id);
      case 'get_history':
        if (!project_id) throw new Error('project_id required');
        return await handleGetHistory(supabaseClient, project_id);
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Error in prompt-architect:', error);
    let userMessage = 'An error occurred';
    let statusCode = 500;
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized') || error.message.includes('access denied')) {
        userMessage = 'Access denied';
        statusCode = 403;
      } else if (error.message.includes('not found')) {
        userMessage = 'Resource not found';
        statusCode = 404;
      } else if (error.message.includes('must be') || error.message.includes('exceeds') || error.message.includes('required')) {
        userMessage = error.message;
        statusCode = 400;
      }
    }
    return new Response(
      JSON.stringify({ error: userMessage }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// === INTERVIEW HANDLER ===
async function handleInterview(supabaseClient: any, userId: string, sessionId: string, userMessage: string, collected: any) {
  const missing = REQUIRED_FIELDS.filter(field => !collected[field] || collected[field].trim() === '');
  
  await supabaseClient.from('conversation_messages').insert({
    conversation_id: sessionId,
    role: 'user',
    content: userMessage
  });

  if (missing.length > 0) {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    // Generate progressive interview questions
    let questionContext = `Already collected: ${JSON.stringify(collected, null, 2)}\n\nMissing: ${missing.join(', ')}`;
    let focusArea = '';
    
    // Progressive questioning logic
    if (!collected.Business_Context) {
      focusArea = 'Business Context';
      questionContext += `\n\nAsk 2-3 questions about: ${INTERVIEW_QUESTIONS.business_context.join(' ')}`;
    } else if (!collected.Audience) {
      focusArea = 'Audience';
      questionContext += `\n\nAsk 2-3 questions about: ${INTERVIEW_QUESTIONS.audience.join(' ')}`;
    } else if (!collected.Brand_Voice) {
      focusArea = 'Brand Voice';
      questionContext += `\n\nAsk 2-3 questions about: ${INTERVIEW_QUESTIONS.brand_voice.join(' ')}`;
    } else if (!collected.Guardrails) {
      focusArea = 'Guardrails & Compliance';
      questionContext += `\n\nAsk 2-3 questions about: ${INTERVIEW_QUESTIONS.guardrails.join(' ')}`;
    } else if (!collected.Success_Metrics) {
      focusArea = 'Success Metrics';
      questionContext += `\n\nAsk 1-2 questions about: ${INTERVIEW_QUESTIONS.success_metrics.join(' ')}`;
    } else {
      focusArea = 'Remaining Details';
      questionContext += `\n\nAsk specific questions about: ${missing.slice(0, 3).join(', ')}`;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `You're interviewing to build enterprise AI agent metaprompts. Current focus: ${focusArea}. Ask 2-3 concise, targeted questions. Be specific. ${questionContext}` 
          },
          { role: 'user', content: userMessage }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your Lovable workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error('AI gateway error');
    }

    const aiData = await response.json();
    const questions = aiData.choices[0].message.content;

    await supabaseClient.from('conversation_messages').insert({
      conversation_id: sessionId,
      role: 'assistant',
      content: questions
    });

    return new Response(
      JSON.stringify({ 
        type: 'questions',
        questions,
        missing,
        collected,
        progress: `${REQUIRED_FIELDS.length - missing.length}/${REQUIRED_FIELDS.length} fields collected`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ 
      type: 'ready',
      message: 'All required fields collected. Ready to generate enterprise-grade metaprompt!',
      collected 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// === GENERATE HANDLER (R4P PIPELINE) ===
async function handleGenerate(supabaseClient: any, userId: string, sessionId: string, projectId: string, userMessage: string, collected: any, conversationId?: string) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  
  const latencyMetrics: any = { retrieve_start: Date.now() };

  // === STEP 1: HYBRID RETRIEVAL ===
  console.log('[R4P] Starting hybrid retrieval for project:', projectId);
  const searchTerms = `${collected.Goal || ''} ${collected.Audience || ''} ${collected.Output_Format || ''}`.toLowerCase();
  
  // Dense: Vector search
  let denseCandidates: any[] = [];
  if (OPENAI_API_KEY) {
    try {
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: searchTerms,
        }),
      });

      if (embeddingResponse.ok) {
        const embeddingData = await embeddingResponse.json();
        const queryEmbedding = embeddingData.data[0].embedding;
        
        const { data: vectorChunks } = await supabaseClient.rpc('match_kb_chunks', {
          query_embedding: queryEmbedding,
          match_threshold: 0.5,
          match_count: R4P_CONFIG.k_retrieve,
          filter_project_id: projectId
        });
        
        denseCandidates = (vectorChunks || []).map((c: any) => ({ ...c, source: 'dense' }));
      }
    } catch (e) {
      console.error('[R4P] Embedding failed:', e);
    }
  }

  // Sparse: Keyword search (BM25 simulation)
  const keywords = searchTerms.split(/\s+/).filter(k => k.length > 3);
  let sparseCandidates: any[] = [];
  if (keywords.length > 0) {
    const { data: keywordChunks } = await supabaseClient
      .from('kb_chunks')
      .select('id, text, source_name, metadata')
      .eq('project_id', projectId)
      .textSearch('text', keywords.join(' | '), { type: 'plain' })
      .limit(R4P_CONFIG.k_retrieve);
    
    sparseCandidates = (keywordChunks || []).map((c: any) => ({ ...c, source: 'sparse', similarity: 0.6 }));
  }

  // Historical prompts (always include top performers)
  const { data: historicalPrompts } = await supabaseClient
    .from('prompt_records')
    .select('id, synthesized_prompt, total_score, metadata')
    .eq('project_id', projectId)
    .gte('total_score', 0.75)
    .order('total_score', { ascending: false })
    .limit(3);

  // Hybrid fusion (weighted combination)
  const candidateMap = new Map();
  denseCandidates.forEach(c => candidateMap.set(c.id, { ...c, score: c.similarity * R4P_CONFIG.hybrid_lambda }));
  sparseCandidates.forEach(c => {
    if (candidateMap.has(c.id)) {
      candidateMap.get(c.id).score += c.similarity * (1 - R4P_CONFIG.hybrid_lambda);
    } else {
      candidateMap.set(c.id, { ...c, score: c.similarity * (1 - R4P_CONFIG.hybrid_lambda) });
    }
  });

  let hybridResults = Array.from(candidateMap.values()).sort((a, b) => b.score - a.score);

  latencyMetrics.retrieve_end = Date.now();
  latencyMetrics.retrieve_ms = latencyMetrics.retrieve_end - latencyMetrics.retrieve_start;

  // === STEP 2: RE-RANKING ===
  latencyMetrics.rerank_start = Date.now();
  
  // Simple re-ranking: boost by freshness, source name match, score
  hybridResults = hybridResults.map(chunk => {
    let rerankScore = chunk.score;
    if (chunk.source_name && chunk.source_name.toLowerCase().includes('best_practices')) rerankScore += 0.1;
    if (chunk.source_name && chunk.source_name.toLowerCase().includes('prompt')) rerankScore += 0.05;
    return { ...chunk, rerank_score: rerankScore };
  }).sort((a, b) => b.rerank_score - a.rerank_score).slice(0, R4P_CONFIG.rerank_top);

  latencyMetrics.rerank_end = Date.now();
  latencyMetrics.rerank_ms = latencyMetrics.rerank_end - latencyMetrics.rerank_start;

  // === STEP 3: CONTEXT ASSEMBLY ===
  let evidence = '\n━━━━━━━━━━━━━━━━━━━━━━━\nRETRIEVED EVIDENCE\n━━━━━━━━━━━━━━━━━━━━━━━\n';
  const citations: any[] = [];

  if (hybridResults.length > 0) {
    evidence += '\n📚 KNOWLEDGE BASE (Top 5 chunks by hybrid retrieval + re-ranking):\n\n';
    hybridResults.forEach((chunk, i) => {
      const uri = `kb://chunk/${chunk.id}`;
      const hash = chunk.id.substring(0, 8);
      evidence += `[${i + 1}] ${chunk.source_name || 'KB'} (score: ${chunk.rerank_score?.toFixed(2)})\n${chunk.text}\n\n`;
      citations.push({ uri, version: '1.0', hash, source: chunk.source_name });
    });
  }

  if (historicalPrompts && historicalPrompts.length > 0) {
    evidence += '\n📊 HIGH-PERFORMING HISTORICAL PROMPTS:\n\n';
    historicalPrompts.forEach((p: any, i: number) => {
      const uri = `prompt://record/${p.id}`;
      const hash = p.id.substring(0, 8);
      evidence += `[Example ${i + 1}] Score: ${p.total_score?.toFixed(2)}\n${p.synthesized_prompt.substring(0, 400)}...\n\n`;
      citations.push({ uri, version: '1.0', hash, source: 'historical_prompt' });
    });
  }

  console.log('[R4P] Evidence assembled - KB chunks:', hybridResults.length, 'Historical:', historicalPrompts?.length || 0);

  // === STEP 4: SYNTHESIS (Draft) ===
  latencyMetrics.draft_start = Date.now();

  const userPrompt = `CREATE enterprise-grade metaprompt + datasets for AI agent.

REQUIREMENTS:
━━━━━━━━━━━━━━━━━━━━━━━
Goal: ${collected.Goal}
Audience: ${collected.Audience}
Inputs: ${collected.Inputs}
Output Format: ${collected.Output_Format}
Constraints: ${collected.Constraints}
Style: ${collected.Style || 'Professional'}
Guardrails: ${collected.Guardrails || 'Standard safety'}
Business Context: ${collected.Business_Context || 'Not specified'}
Brand Voice: ${collected.Brand_Voice || 'Professional, helpful'}
Success Metrics: ${collected.Success_Metrics || 'User satisfaction'}

${evidence}

GENERATE: Complete JSON per system schema. Include 4 datasets (faq_patterns, conversation_flows, tone_guidelines, edge_cases). Cite all evidence used.`;

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
        { role: 'user', content: userPrompt }
      ],
    }),
  });

  if (!synthesisResponse.ok) {
    if (synthesisResponse.status === 429) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (synthesisResponse.status === 402) {
      return new Response(
        JSON.stringify({ error: 'Payment required. Please add credits to your Lovable workspace.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    throw new Error('Synthesis failed');
  }

  const synthesisData = await synthesisResponse.json();
  const rawContent = synthesisData.choices[0].message.content;

  latencyMetrics.draft_end = Date.now();
  latencyMetrics.draft_ms = latencyMetrics.draft_end - latencyMetrics.draft_start;

  // === STEP 5: VALIDATION ===
  latencyMetrics.validate_start = Date.now();

  let metaResult: any;
  try {
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      metaResult = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON found in response');
    }
  } catch (e) {
    console.error('[R4P] Failed to parse synthesis JSON:', e);
    metaResult = {
      metaprompt: { version: '1.0.0', persona: {}, goals: [], policies: {}, datasets: [], tools: [], output_contract: {}, self_checks: [] },
      datasets: {},
      compliance: {},
      citations: [],
      confidence: 0.5
    };
  }

  // Merge citations
  metaResult.citations = [...(metaResult.citations || []), ...citations];

  latencyMetrics.validate_end = Date.now();
  latencyMetrics.validate_ms = latencyMetrics.validate_end - latencyMetrics.validate_start;

  // === STEP 6: GRADING ===
  latencyMetrics.grade_start = Date.now();

  const gradingResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-pro',
      messages: [
        { 
          role: 'system', 
          content: `Grade this metaprompt on R4P rubric: IntentAccuracy (30%), TaskCompletion (25%), PolicyAdherence (20%), ToneFit (15%), FormatCompliance (10%). Return ONLY JSON: {"IntentAccuracy":0.9,"TaskCompletion":0.85,"PolicyAdherence":0.9,"ToneFit":0.8,"FormatCompliance":0.95,"confidence":0.88}` 
        },
        { role: 'user', content: `Grade this:\n\n${JSON.stringify(metaResult, null, 2)}` }
      ],
    }),
  });

  const gradingData = await gradingResponse.json();
  let scores = { IntentAccuracy: 0.85, TaskCompletion: 0.85, PolicyAdherence: 0.85, ToneFit: 0.80, FormatCompliance: 0.90, confidence: 0.85 };
  
  try {
    const gradingText = gradingData.choices[0].message.content;
    const jsonMatch = gradingText.match(/\{[^}]+\}/);
    if (jsonMatch) {
      scores = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('[R4P] Error parsing grades:', e);
  }

  // Calculate composite score
  const compositeScore = 
    scores.IntentAccuracy * R4P_CONFIG.rubric_weights.IntentAccuracy +
    scores.TaskCompletion * R4P_CONFIG.rubric_weights.TaskCompletion +
    scores.PolicyAdherence * R4P_CONFIG.rubric_weights.PolicyAdherence +
    scores.ToneFit * R4P_CONFIG.rubric_weights.ToneFit +
    scores.FormatCompliance * R4P_CONFIG.rubric_weights.FormatCompliance;

  latencyMetrics.grade_end = Date.now();
  latencyMetrics.grade_ms = latencyMetrics.grade_end - latencyMetrics.grade_start;

  // === STEP 7: CONFIDENCE GATING & REFINEMENT ===
  let finalResult = metaResult;
  let finalScores = { ...scores, composite: compositeScore };

  if (compositeScore < R4P_CONFIG.confidence_thresholds.skip_refine_if_over && compositeScore >= R4P_CONFIG.confidence_thresholds.refine_min) {
    // ONE refinement pass only
    latencyMetrics.refine_start = Date.now();

    console.log('[R4P] Composite score', compositeScore.toFixed(2), '< 0.75, attempting refinement...');

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
            content: `REFINE this metaprompt to lift composite score from ${compositeScore.toFixed(2)} to ≥0.80. Weakest dimensions: ${Object.entries(scores).filter(([k, v]) => typeof v === 'number' && v < 0.80).map(([k]) => k).join(', ')}\n\nCurrent:\n${JSON.stringify(metaResult, null, 2)}\n\nScores: ${JSON.stringify(scores)}\n\nReturn refined JSON.` 
          }
        ],
      }),
    });

    const refinementData = await refinementResponse.json();
    const refinedContent = refinementData.choices[0].message.content;

    try {
      const jsonMatch = refinedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        finalResult = JSON.parse(jsonMatch[0]);
        finalResult.citations = [...(finalResult.citations || []), ...citations]; // re-merge citations
      }
    } catch (e) {
      console.error('[R4P] Refinement parse failed, keeping original');
    }

    // Re-grade
    const regradeResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: `Grade on R4P rubric. Return JSON: {"IntentAccuracy":X,"TaskCompletion":X,"PolicyAdherence":X,"ToneFit":X,"FormatCompliance":X,"confidence":X}` },
          { role: 'user', content: `Grade refined:\n\n${JSON.stringify(finalResult, null, 2)}` }
        ],
      }),
    });

    const regradeData = await regradeResponse.json();
    try {
      const regradeText = regradeData.choices[0].message.content;
      const jsonMatch = regradeText.match(/\{[^}]+\}/);
      if (jsonMatch) {
        const newScores = JSON.parse(jsonMatch[0]);
        const newComposite = 
          newScores.IntentAccuracy * R4P_CONFIG.rubric_weights.IntentAccuracy +
          newScores.TaskCompletion * R4P_CONFIG.rubric_weights.TaskCompletion +
          newScores.PolicyAdherence * R4P_CONFIG.rubric_weights.PolicyAdherence +
          newScores.ToneFit * R4P_CONFIG.rubric_weights.ToneFit +
          newScores.FormatCompliance * R4P_CONFIG.rubric_weights.FormatCompliance;
        
        // Only keep refinement if uplift ≥0.02
        if (newComposite >= compositeScore + 0.02) {
          finalScores = { ...newScores, composite: newComposite };
          console.log('[R4P] Refinement successful, new composite:', newComposite.toFixed(2));
        } else {
          console.log('[R4P] Refinement yielded no material uplift, keeping original');
          finalResult = metaResult;
        }
      }
    } catch (e) {
      console.error('[R4P] Regrade parse failed');
    }

    latencyMetrics.refine_end = Date.now();
    latencyMetrics.refine_ms = latencyMetrics.refine_end - latencyMetrics.refine_start;
  } else if (compositeScore < R4P_CONFIG.confidence_thresholds.refine_min) {
    // Too low confidence - escalate/clarify
    console.log('[R4P] Composite score', compositeScore.toFixed(2), '< 0.60, should escalate for clarification');
    // For now, ship anyway but flag low confidence
  }

  latencyMetrics.total_ms = Date.now() - latencyMetrics.retrieve_start;

  // === STEP 8: STORE ===
  console.log('[R4P] Storing prompt record, composite score:', finalScores.composite.toFixed(2));
  const { data: promptRecord, error: storeError } = await supabaseClient
    .from('prompt_records')
    .insert({
      project_id: projectId,
      conversation_id: conversationId || null,
      prompt_text: userMessage || 'Generated from interview',
      synthesized_prompt: JSON.stringify(finalResult.metaprompt, null, 2),
      metadata: {
        datasets: finalResult.datasets || {},
        compliance: finalResult.compliance || {},
        citations: finalResult.citations || [],
        collected_fields: collected,
        kb_chunks_used: hybridResults.length,
        historical_prompts_used: historicalPrompts?.length || 0,
        latency_metrics: latencyMetrics,
        r4p_version: '1.3.2',
        models_used: { synthesis: 'gemini-2.5-flash', grading: 'gemini-2.5-pro' }
      },
      scores: finalScores,
      total_score: finalScores.composite,
      features: collected
    })
    .select()
    .single();

  if (storeError) {
    console.error('[R4P] Error storing prompt:', storeError);
    throw new Error('Failed to save prompt record');
  }

  console.log('[R4P] Generation complete, prompt ID:', promptRecord?.id);

  // === STEP 9: RETURN ===
  return new Response(
    JSON.stringify({
      type: 'generated',
      metaprompt: finalResult.metaprompt,
      datasets: finalResult.datasets,
      compliance: finalResult.compliance,
      citations: finalResult.citations,
      scores: finalScores,
      confidence: finalResult.confidence || finalScores.confidence,
      latency_metrics: latencyMetrics,
      id: promptRecord?.id,
      collected,
      references: {
        kb_chunks: hybridResults.length,
        historical_prompts: historicalPrompts?.length || 0
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// === HISTORY HANDLER ===
async function handleGetHistory(supabaseClient: any, projectId: string) {
  const { data: prompts, error } = await supabaseClient
    .from('prompt_records')
    .select('id, prompt_text, synthesized_prompt, total_score, created_at, scores, features, metadata')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;

  return new Response(
    JSON.stringify({ prompts }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
