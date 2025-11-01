# Prompt Architect Deployment Guide

This guide explains how to deploy Prompt Architect for yourself or distribute it to other users/businesses.

---

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Distribution Options](#distribution-options)
3. [Option A: Lovable Cloud (Easiest)](#option-a-lovable-cloud-easiest)
4. [Option B: Self-Hosted with Supabase](#option-b-self-hosted-with-supabase)
5. [Environment Variables](#environment-variables)
6. [Database Setup](#database-setup)
7. [Edge Functions](#edge-functions)
8. [Troubleshooting](#troubleshooting)

---

## System Architecture

Prompt Architect uses:
- **Frontend**: React + TypeScript + Tailwind CSS (Vite)
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **AI Models**: OpenAI GPT-5 (prompt generation) + text-embedding-3-small (vector search)
- **Vector Search**: pgvector extension for semantic KB retrieval

### Key Features
✅ Enterprise RAG with vector embeddings (50-100 chunks retrieved per query)  
✅ Metaprompting: Generates prompt + curated reference datasets  
✅ Quality scoring with auto-refinement  
✅ Session persistence with form auto-save  
✅ Secure RLS policies for multi-tenant data isolation  

---

## Distribution Options

### Option A: Lovable Cloud (Recommended for Non-Technical Users)
- ✅ Fastest setup (5 minutes)
- ✅ Zero infrastructure management
- ✅ Automatic deployments
- ❌ Requires Lovable account
- ❌ Usage-based pricing

### Option B: Self-Hosted (For Developers/Enterprises)
- ✅ Full control over infrastructure
- ✅ No vendor lock-in
- ❌ Requires DevOps knowledge
- ❌ Manual deployment and updates

---

## Option A: Lovable Cloud (Easiest)

### Step 1: Remix the Project
1. User receives a Lovable project link from you
2. Click **"Remix this project"** in Lovable
3. This creates their own copy with all code + database

### Step 2: Configure Secrets
1. Go to **Project Settings → Secrets**
2. Add the following secret:
   - `OPENAI_API_KEY` = Your OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

### Step 3: Deploy
1. Click **"Publish"** in the top-right corner
2. Wait 1-2 minutes for deployment
3. Access your app at `yourapp.lovable.app`

### Step 4: Custom Domain (Optional)
1. Go to **Project Settings → Domains**
2. Add your custom domain (e.g., `prompts.yourcompany.com`)
3. Update DNS records as instructed

**That's it!** The database is automatically configured and migrations are applied.

---

## Option B: Self-Hosted with Supabase

### Prerequisites
- Node.js 18+ installed
- Supabase account ([Sign up](https://supabase.com))
- OpenAI API key

### Step 1: Clone the Repository
```bash
git clone <your-github-repo-url>
cd prompt-architect
npm install
```

### Step 2: Create Supabase Project
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Note down:
   - Project URL (e.g., `https://xxxxx.supabase.co`)
   - Anon Key (public key)
   - Service Role Key (secret key)

### Step 3: Configure Environment Variables
Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_PROJECT_ID=xxxxx
```

### Step 4: Run Database Migrations
Install Supabase CLI:
```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-id>
```

Apply migrations:
```bash
supabase db push
```

This will:
- Create `projects`, `kb_chunks`, `prompt_records`, `prompt_outcomes`, `interview_turns` tables
- Enable pgvector extension
- Set up RLS policies
- Create the `match_kb_chunks()` vector search function

### Step 5: Configure Edge Functions

#### Install Supabase CLI (if not done)
```bash
npm install -g supabase
```

#### Set Secrets
```bash
supabase secrets set OPENAI_API_KEY=sk-...
```

#### Deploy Edge Functions
```bash
supabase functions deploy prompt-architect
supabase functions deploy generate-embedding
```

### Step 6: Enable Auto-Confirm for Email Signups
1. Go to **Supabase Dashboard → Authentication → Settings**
2. Scroll to **Email Auth**
3. Toggle **"Enable email confirmations"** to **OFF**
4. Save changes

This allows users to sign up without email verification (suitable for demos/prototypes).

### Step 7: Deploy Frontend
Choose a platform:

#### Vercel
```bash
npm install -g vercel
vercel
```

#### Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod
```

#### Cloudflare Pages
```bash
npm run build
# Upload dist/ folder to Cloudflare Pages
```

---

## Environment Variables

### Required
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public anon key | `eyJhbGciOiJIUz...` |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID | `xxxxx` |

### Edge Function Secrets (Supabase only)
| Secret | Description | Get From |
|--------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key | https://platform.openai.com/api-keys |

---

## Database Setup

### Tables Created
1. **projects** - User projects
2. **kb_chunks** - Knowledge base chunks with vector embeddings
3. **prompt_records** - Generated prompts with scores
4. **prompt_outcomes** - User feedback on prompts
5. **interview_turns** - AI interview conversation history

### pgvector Configuration
The `kb_chunks` table has an `embedding` column (vector(1536)) for OpenAI embeddings.

Vector search is performed via:
```sql
SELECT * FROM match_kb_chunks(
  query_embedding := '[0.1, 0.2, ...]'::vector,
  match_threshold := 0.5,
  match_count := 50,
  filter_project_id := 'user-project-uuid'
);
```

### RLS Policies
All tables have Row Level Security enabled:
- Users can only access their own projects
- KB chunks/prompts are scoped to user's projects
- No cross-user data leakage

---

## Edge Functions

### 1. prompt-architect
**Endpoint**: `/functions/v1/prompt-architect`

**Actions**:
- `interview` - AI interview to collect requirements
- `generate` - Generate prompt + datasets using RAG
- `get_history` - Retrieve past prompts

**Models Used**:
- GPT-5 (2025-08-07) for prompt synthesis
- GPT-5-mini for grading/refinement
- text-embedding-3-small for vector search

### 2. generate-embedding
**Endpoint**: `/functions/v1/generate-embedding`

**Purpose**: Generate OpenAI embeddings for KB chunks

**Input**:
```json
{
  "text": "Your prompt engineering knowledge..."
}
```

**Output**:
```json
{
  "embedding": [0.123, 0.456, ...]
}
```

---

## Troubleshooting

### Issue: "Failed to generate embedding"
**Cause**: OpenAI API key not configured or invalid  
**Fix**: 
```bash
supabase secrets set OPENAI_API_KEY=sk-proj-...
supabase functions deploy generate-embedding
```

### Issue: Vector search returns 0 results
**Cause**: KB chunks have no embeddings  
**Fix**: Re-upload knowledge base files (embeddings are auto-generated on upload)

### Issue: "Project not found or access denied"
**Cause**: RLS policy blocking access  
**Fix**: Ensure user is authenticated and owns the project

### Issue: Low quality scores (<0.80)
**Cause**: Insufficient KB data or vague requirements  
**Fix**: 
1. Upload more specific examples to KB
2. Provide detailed constraints in the form
3. Use the AI interview to clarify requirements

### Issue: Slow generation (>30 seconds)
**Cause**: Large KB retrieval or GPT-5 latency  
**Fix**: 
- Optimize KB (remove duplicate/irrelevant chunks)
- Use GPT-5-mini for faster synthesis (edit edge function)

---

## Cost Estimates

### OpenAI Usage (per prompt generation)
- Embeddings: ~$0.001 per KB chunk upload
- Vector search: Free (cached embeddings)
- Prompt synthesis: ~$0.03-0.05 per generation (GPT-5)
- Refinement: ~$0.01 per refinement (GPT-5-mini)

**Typical cost**: $0.05-0.10 per enterprise prompt generated

### Supabase Pricing
- Free tier: 500MB database, 2GB bandwidth/month
- Pro ($25/mo): 8GB database, 250GB bandwidth
- Edge functions: Included (2M invocations/month on Pro)

---

## Security Best Practices

✅ **Never commit secrets** - Use Supabase Secrets or environment variables  
✅ **Enable RLS** - All tables have Row Level Security enabled  
✅ **Validate inputs** - Edge functions validate all user inputs  
✅ **Use HTTPS** - Always deploy with SSL certificates  
✅ **Rate limiting** - Implement rate limits on edge functions for production  

---

## Support

### Documentation Links
- [Lovable Docs](https://docs.lovable.dev)
- [Supabase Docs](https://supabase.com/docs)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)

### Getting Help
1. Check [USAGE_GUIDE.md](./USAGE_GUIDE.md) for feature documentation
2. Review edge function logs in Supabase Dashboard
3. Open an issue on GitHub (if open source)

---

## License

[Your License Here - MIT, Apache 2.0, etc.]
