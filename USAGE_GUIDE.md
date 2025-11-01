# Prompt Architect - Enterprise Usage Guide

## 🎯 Overview

Prompt Architect is an enterprise-grade prompt engineering platform that uses RAG (Retrieval-Augmented Generation) to create production-ready AI prompts. It combines an intelligent interview process, knowledge base retrieval, and automated quality grading to deliver prompts that meet professional standards.

## 🚀 Quick Start

### 1. Sign Up & Authentication
- Create an account using email and password
- Auto-confirmed signups - no email verification needed
- Your session persists across visits

### 2. Upload Knowledge Base (Recommended First Step)
- Navigate to the **Knowledge Base** section
- Upload your prompt engineering datasets, best practices, examples
- Supported formats: **TXT, JSON, CSV, MD**
- Files are automatically chunked for optimal retrieval
- **Why this matters**: The AI references your knowledge base when generating prompts, incorporating proven patterns and techniques

### 3. Fill Out the Requirements Form

The form collects 5 critical pieces of information:

#### **Goal** (10-500 characters)
What do you want to achieve?
- Example: "Generate product descriptions for our e-commerce site"
- Be specific and measurable

#### **Audience** (3-200 characters)  
Who will use this? Which channel?
- Example: "Marketing team, web content"
- Consider: internal team vs external users, channel constraints

#### **Inputs** (5-2000 characters)
What data will be provided to the AI?
- Example: "Product specs, features, target demographics"
- Be comprehensive - list all expected input types

#### **Output Format** (2-50 characters)
JSON, Markdown, plain text, etc.
- Example: "JSON" or "Markdown with headings"
- If JSON, you'll get a detailed schema in the output

#### **Constraints** (5-2000 characters)
Length limits, tone, safety requirements
- Example: "Max 150 words, professional tone, avoid technical jargon"
- Include ALL hard requirements

### 4. Optional: Use the AI Interview
- Click the chat input and describe your needs conversationally
- The AI asks clarifying questions to fill gaps
- Responses auto-populate the form fields
- **Form data is auto-saved** - refresh-safe!

### 5. Generate Your Prompt
- Once all 5 required fields are complete, the **Generate Enterprise Prompt** button appears
- Click to generate
- Wait ~10-15 seconds for:
  1. RAG retrieval from your knowledge base
  2. Synthesis using GPT-5 Pro
  3. Quality grading
  4. Optional refinement if score < 80%

### 6. Review & Use Your Prompt
- Switch to the **Result** tab
- See quality scores (Clarity, Completeness, Determinism, Safety)
- Copy or download the prompt
- Reference count shows how many KB patterns were used

## 📊 Understanding Quality Scores

Your prompt is graded on 5 dimensions:

| Metric | Target | What It Measures |
|--------|--------|-----------------|
| **Clarity** | ≥0.70 | Is the prompt unambiguous and easy to understand? |
| **Completeness** | ≥0.70 | Does it include all necessary information? |
| **Constraint Adherence** | ≥0.70 | Does it respect the output format and constraints? |
| **Determinism** | ≥0.70 | Will it produce consistent results? |
| **Safety** | ≥0.70 | Does it include appropriate guardrails? |
| **Total Score** | ≥0.80 | Overall quality threshold |

If a prompt scores below threshold, it's **automatically refined** and re-graded.

## 🎓 Best Practices

### Knowledge Base Strategy
1. **Start with foundational documents**: Upload general prompt engineering guides first
2. **Add domain-specific examples**: Include successful prompts from your industry
3. **Regular updates**: As you learn what works, add those patterns to KB
4. **Organize by file**: Use descriptive filenames (e.g., `ecommerce_prompts.txt`, `seo_best_practices.md`)

### Form Completion Tips
- **Goal**: Use action verbs, specify success criteria
- **Audience**: Include technical level and context
- **Inputs**: List even optional inputs with "(optional)" notation
- **Format**: Be specific - "JSON with keys: title, body, tags" vs just "JSON"
- **Constraints**: Include length, tone, forbidden topics, required elements

### Iteration Workflow
1. Generate initial prompt
2. Test with real data
3. Note what works and what doesn't
4. Refine requirements
5. Regenerate with updated specs
6. Store successful prompts in your library

## 🔄 RAG (Retrieval-Augmented Generation) Explained

When you click "Generate":

```
1. Your Requirements → Search Query
   ├─ Goal: "product descriptions"
   ├─ Audience: "marketing team"  
   └─ Format: "JSON"
   
2. Retrieval Phase
   ├─ Search your KB chunks for relevant patterns
   ├─ Retrieve top historical prompts (if any)
   └─ Build "evidence pack" for the AI
   
3. Synthesis Phase
   ├─ AI receives: requirements + evidence pack
   ├─ AI generates structured prompt
   └─ Follows enterprise skeleton (ROLE → OBJECTIVE → CONTEXT → INPUT → OUTPUT_FORMAT → CONSTRAINTS → EXECUTE)
   
4. Quality Assurance
   ├─ Automated grading on 5 criteria
   ├─ If score < 0.80: automatic refinement
   └─ Re-grade refined version
   
5. Storage & Display
   ├─ Save to prompt_records table
   ├─ Display with scores and metadata
   └─ Add to your library
```

## 🛠️ Technical Details

### Architecture
- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Lovable Cloud (Supabase)
- **AI Models**: 
  - Interviews: `google/gemini-2.5-flash`
  - Synthesis: `google/gemini-2.5-pro`
  - Grading: `google/gemini-2.5-flash`
- **Storage**: PostgreSQL with RLS policies

### Data Tables
- **projects**: User project container
- **kb_chunks**: Knowledge base text chunks
- **prompt_records**: Generated prompts with scores
- **interview_turns**: Conversation history

### Security
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- API keys stored securely in environment
- Authentication via Supabase Auth

## 🐛 Troubleshooting

### "Form data disappeared"
**Solution**: Form data is now auto-saved to sessionStorage. This should never happen. If it does, clear your browser cache.

### "No knowledge base patterns used"
**Possible causes**:
1. Haven't uploaded any KB files yet → Upload some datasets
2. KB files don't match your requirements → Add more relevant content
3. Database upload failed → Check console for errors

**To verify**: Look at the badge showing "X chunks" in the Knowledge Base section

### "Low quality scores"
**Solutions**:
1. Add more detail to Constraints field
2. Upload relevant examples to KB
3. Be more specific in Goal and Inputs
4. Specify exact output format (e.g., provide JSON schema)

### "Generation taking too long"
**Expected**: 10-15 seconds is normal
**If >30 seconds**: Check edge function logs in Lovable Cloud console

## 💡 Pro Tips

1. **Batch Similar Prompts**: If creating multiple prompts for the same domain, upload KB once and iterate on requirements
2. **Use History**: Click old prompts in Library to view them - learn from what worked
3. **Copy Successful Patterns**: Export high-scoring prompts and add them to your KB
4. **Test Incrementally**: Start simple, test, then add complexity
5. **Monitor Scores Over Time**: Track which requirement patterns lead to higher scores

## 📈 Metrics to Track

For each prompt in your library, you can see:
- **Total Score**: Overall quality (aim for 85%+)
- **References Used**: How many KB patterns informed this prompt
- **Created Date**: When it was generated
- **Feature Count**: How many requirements were specified

Use these to identify your most successful prompts and reverse-engineer what made them work.

## 🎯 Success Criteria

You'll know the system is working when:
- ✅ Generated prompts follow the structured format (ROLE → OBJECTIVE → etc.)
- ✅ Quality scores consistently above 80%
- ✅ KB reference count > 0 on generations
- ✅ Prompts actually work when tested with real AI models
- ✅ You're building a library of reusable patterns

## 🔒 Data & Privacy

- Your data never leaves your project
- KB content is private to your account
- Prompts are only visible to you
- Can delete KB chunks and prompts anytime

## 📞 Support

If you encounter issues:
1. Check edge function logs (Lovable Cloud → Functions)
2. Review console logs in browser DevTools
3. Verify database tables have data (Lovable Cloud → Database)
4. Contact support with specific error messages

---

**Version**: 1.0  
**Last Updated**: 2025-11-01  
**Built for**: Enterprise prompt engineering teams who need consistency, quality, and scale
