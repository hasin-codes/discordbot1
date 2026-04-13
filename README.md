# Zhipu-Fushou Discord Bot — Complete Setup & Deployment Guide

> Built by **[Hasin Raiyan](https://hasin.vercel.app/)** for the **Z.ai Discord Server** — RAG-powered support automation with semantic conversation analysis and intelligent issue tracking.

📖 **For code details and explanations, use ZRead:** [![zread](https://img.shields.io/badge/Ask_Zread-_.svg?style=for-the-badge&color=00b0aa&labelColor=000000&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQuOTYxNTYgMS42MDAxSDIuMjQxNTZDMS44ODgxIDEuNjAwMSAxLjYwMTU2IDEuODg2NjQgMS42MDE1NiAyLjI0MDFWNC45NjAxQzEuNjAxNTYgNS4zMTM1NiAxLjg4ODEgNS42MDAxIDIuMjQxNTYgNS42MDAxSDQuOTYxNTZDNS4zMTUwMiA1LjYwMDEgNS42MDE1NiA1LjMxMzU2IDUuNjAxNTYgNC45NjAxVjIuMjQwMUM1LjYwMTU2IDEuODg2NjQgNS4zMTUwMiAxLjYwMDEgNC45NjE1NiAxLjYwMDFaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00Ljk2MTU2IDEwLjM5OTlIMi4yNDE1NkMxLjg4ODEgMTAuMzk5OSAxLjYwMTU2IDEwLjY4NjQgMS42MDE1NiAxMS4wMzk5VjEzLjc1OTlDMS42MDE1NiAxNC4xMTM0IDEuODg4MSAxNC4zOTk5IDIuMjQxNTYgMTQuMzk5OUg0Ljk2MTU2QzUuMzE1MDIgMTQuMzk5OSA1LjYwMTU2IDE0LjExMzQgNS42MDE1NiAxMy43NTk5VjExLjAzOTlDNS42MDE1NiAxMC42ODY0IDUuMzE1MDIgMTAuMzk5OSA0Ljk2MTU2IDEwLjM5OTlaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik0xMy43NTg0IDEuNjAwMUgxMS4wMzg0QzEwLjY4NSAxLjYwMDEgMTAuMzk4NCAxLjg4NjY0IDEwLjM5ODQgMi4yNDAxVjQuOTYwMUMxMC4zOTg0IDUuMzEzNTYgMTAuNjg1IDUuNjAwMSAxMS4wMzg0IDUuNjAwMUgxMy43NTg0QzE0LjExMTkgNS42MDAxIDE0LjM5ODQgNS4zMTM1NiAxNC4zOTg0IDQuOTYwMVYyLjI0MDFDMTQuMzk4NCAxLjg4NjY0IDE0LjExMTkgMS42MDAxIDEzLjc1ODQgMS42MDAxWiIgZmlsbD0iI2ZmZiIvPgo8cGF0aCBkPSJNNCAxMkwxMiA0TDQgMTJaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00IDEyTDEyIDQiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K&logoColor=ffffff)](https://zread.ai/hasin-codes/Z.ai-claw)

![Node.js](https://img.shields.io/badge/Node.js-20+-green?style=flat&logo=node.js)
![Discord.js](https://img.shields.io/badge/Discord.js-14+-blue?style=flat&logo=discord)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat&logo=supabase)
![Qdrant](https://img.shields.io/badge/Qdrant-VectorDB-orange?style=flat)
![Cloudflare AI](https://img.shields.io/badge/Cloudflare%20AI-Workers-F38020?style=flat)

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Step 1: Discord Bot Setup](#step-1-discord-bot-setup)
- [Step 2: Supabase Project Setup](#step-2-supabase-project-setup)
  - [2.1 Create Project](#21-create-project)
  - [2.2 Create Database Tables](#22-create-database-tables)
  - [2.3 Configure Row Level Security (RLS)](#23-configure-row-level-security-rls)
  - [2.4 Deploy Supabase Edge Functions](#24-deploy-supabase-edge-functions)
  - [2.5 Set Up pg_cron Jobs](#25-set-up-pg_cron-jobs)
- [Step 3: Qdrant Vector Database Setup](#step-3-qdrant-vector-database-setup)
  - [3.1 Create Qdrant Instance](#31-create-qdrant-instance)
  - [3.2 Collections Created Automatically](#32-collections-created-automatically)
- [Step 4: Cloudflare Workers AI Setup](#step-4-cloudflare-workers-ai-setup)
- [Step 5: Redis Setup](#step-5-redis-setup)
- [Step 6: Ingest Documentation Files](#step-6-ingest-documentation-files)
- [Step 7: Railway Deployment](#step-7-railway-deployment)
  - [7.1 Connect Repository](#71-connect-repository)
  - [7.2 Configure Environment Variables](#72-configure-environment-variables)
  - [7.3 Configure Redis on Railway](#73-configure-redis-on-railway)
  - [7.4 Deploy](#74-deploy)
- [Step 8: Post-Deployment Verification](#step-8-post-deployment-verification)
- [Complete Environment Variable Reference](#complete-environment-variable-reference)
  - [Category 1: Discord Authentication](#category-1-discord-authentication)
  - [Category 2: Supabase Database](#category-2-supabase-database)
  - [Category 3: Qdrant Vector Database](#category-3-qdrant-vector-database)
  - [Category 4: Cloudflare AI Services](#category-4-cloudflare-ai-services)
  - [Category 5: Redis Job Queue](#category-5-redis-job-queue)
  - [Category 6: Discord Channels & Roles](#category-6-discord-channels--roles)
  - [Category 7: Pipeline Control](#category-7-pipeline-control)
  - [Category 8: Logging & Debug](#category-8-logging--debug)
- [Architecture Overview](#architecture-overview)
- [Database Schema Reference](#database-schema-reference)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have accounts and access to:

| Service | Purpose | Required Tier |
|---------|---------|---------------|
| **Discord Developer Portal** | Bot creation and token generation | Free |
| **Supabase** | PostgreSQL database, Edge Functions, pg_cron | Free tier works |
| **Qdrant Cloud** | Vector database for RAG knowledge retrieval | Free tier (1 cluster) |
| **Cloudflare** | Workers AI for embeddings, LLM classification, reranking | Free tier |
| **Railway** | Bot hosting with Node.js + Redis | Paid (or trial credits) |
| **GitHub** | Source code repository | Free |

**Local development requirements:**
- Node.js >= 20.0.0
- npm (comes with Node.js)
- Supabase CLI (for edge function deployment)
- Git

---

## Step 1: Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"** → Name it → Create
3. Navigate to **Bot** in the left sidebar
4. Click **"Add Bot"** → **"Reset Token"** → **Copy the token** (save it securely — you only see it once)
5. Under **Privileged Gateway Intents**, enable:
   - ✅ **MESSAGE CONTENT INTENT**
   - ✅ **SERVER MEMBERS INTENT**
   - ✅ **PRESENCE INTENT** (optional, but recommended)
6. Go to **OAuth2 → URL Generator**, select scopes:
   - ✅ `bot`
   - ✅ `applications.commands`
7. Under **Bot Permissions**, select:
   - ✅ **Send Messages**
   - ✅ **Send Messages in Threads**
   - ✅ **Manage Threads**
   - ✅ **Create Public Threads**
   - ✅ **Embed Links**
   - ✅ **Read Message History**
   - ✅ **Mention Everyone**
   - ✅ **Use Slash Commands**
   - ✅ **View Channels**
8. Copy the generated URL, open it in browser, and invite the bot to your server
9. **Record these values** (right-click in Discord → Copy ID — requires Developer Mode enabled):
   - **CLIENT_ID**: From OAuth2 → Client ID
   - **GUILD_ID**: Right-click your server name → Copy ID
   - **BAD_REPORT_CHANNEL_ID**: Right-click your support forum channel → Copy ID

---

## Step 2: Supabase Project Setup

### 2.1 Create Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **"New Project"** → Select organization → Name it → Set database password → Create
3. Wait for provisioning (~2 minutes)
4. Go to **Project Settings → API** and record:
   - **Project URL** → `SUPABASE_URL` (e.g., `https://xxxxx.supabase.co`)
   - **Service Role Key (secret)** → `SUPABASE_SERVICE_KEY` ⚠️ Never expose this client-side
   - **Anon Key (public)** → `SUPABASE_KEY` (safe for client-side, used by some ingestion paths)

### 2.2 Create Database Tables

Open the **SQL Editor** in Supabase and execute the following SQL statements **in order**. These create all tables the bot and pipeline depend on.

> **Do not modify table schemas.** The code references these exact column names. If you change them, the bot will break.

#### Table 1: `users`

```sql
create table public.users (
  discord_id text not null,
  username text not null,
  joined_at timestamp with time zone null default now(),
  open_issue_count integer null default 0,
  last_seen_at timestamp with time zone null default now(),
  constraint users_pkey primary key (discord_id)
);
```

#### Table 2: `issues`

```sql
create table public.issues (
  id uuid not null default gen_random_uuid (),
  short_id text not null,
  user_discord_id text not null,
  thread_id text null,
  guild_id text not null,
  channel_id text not null,
  department text null default 'unclassified'::text,
  status text null default 'open'::text,
  title text not null,
  description text not null,
  steps_tried text null,
  summary text null,
  assigned_to text null,
  feishu_task_id text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  resolved_at timestamp with time zone null,
  last_reminded_at timestamp with time zone null,
  reminder_count integer null default 0,
  role_pinged_at timestamp with time zone null,
  evidence jsonb null default '{}'::jsonb,
  phase text null default 'triage'::text,
  constraint issues_pkey primary key (id),
  constraint issues_short_id_key unique (short_id),
  constraint issues_user_discord_id_fkey foreign key (user_discord_id) references users (discord_id),
  constraint issues_phase_check check (phase = any (array['triage'::text, 'gathering'::text, 'escalated'::text])),
  constraint issues_status_check check (status = any (array['open'::text, 'acknowledged'::text, 'in_progress'::text, 'resolved'::text, 'closed'::text]))
);
```

#### Table 3: `issue_messages`

```sql
create table public.issue_messages (
  id uuid not null default gen_random_uuid (),
  issue_id uuid not null,
  role text not null,
  content text not null,
  discord_msg_id text null,
  created_at timestamp with time zone null default now(),
  constraint issue_messages_pkey primary key (id),
  constraint issue_messages_issue_id_fkey foreign key (issue_id) references issues (id) on delete cascade,
  constraint issue_messages_role_check check (role = any (array['user'::text, 'assistant'::text, 'system'::text]))
);
```

#### Table 4: `status_log`

```sql
create table public.status_log (
  id uuid not null default gen_random_uuid (),
  issue_id uuid not null,
  old_status text null,
  new_status text not null,
  changed_by text not null,
  note text null,
  changed_at timestamp with time zone null default now(),
  constraint status_log_pkey primary key (id),
  constraint status_log_issue_id_fkey foreign key (issue_id) references issues (id) on delete cascade
);
```

#### Table 5: `bot_config`

```sql
create table public.bot_config (
  key text not null,
  value text null,
  note text null,
  constraint bot_config_pkey primary key (key)
);
```

Populate `bot_config` with default values:

```sql
insert into public.bot_config (key, value, note) values
  ('allowed_guild_ids', '', 'Comma separated guild IDs the bot operates in'),
  ('forward_to_internal', 'true', 'Whether to forward issues to internal channels at all'),
  ('max_open_issues', '300', 'Max open issues per user'),
  ('ping_roles', 'true', 'Whether to ping roles on new issues'),
  ('report_channel_id', '', 'Forum or text channel where issue threads are created'),
  ('report_channel_type', 'forum', 'forum or text — controls how threads are created')
on conflict (key) do nothing;
```

#### Table 6: `departments`

```sql
create table public.departments (
  id uuid not null default gen_random_uuid (),
  name text not null,
  keywords text[] null default '{}'::text[],
  internal_channel_id text null,
  role_id text null,
  created_at timestamp with time zone null default now(),
  constraint departments_pkey primary key (id),
  constraint departments_name_key unique (name)
);
```

Populate default departments:

```sql
insert into public.departments (name, keywords) values
  ('billing', array['payment','charge','refund','invoice','subscription','price','paid','money','billing']),
  ('technical', array['bug','crash','error','broken','not working','cant login','wont load','failed','issue','glitch']),
  ('product', array['feature','suggestion','feedback','idea','improve','missing','request']),
  ('unclassified', array[]::text[])
on conflict (name) do nothing;
```

#### Table 7: `community_messages` (raw ingestion)

```sql
create table public.community_messages (
  message_id text not null,
  channel_id text not null,
  guild_id text not null,
  user_id text not null,
  username text null,
  content text null,
  timestamp timestamp with time zone not null,
  thread_id text null,
  attachments jsonb null default '[]'::jsonb,
  created_at timestamp with time zone null default now(),
  constraint community_messages_pkey primary key (message_id)
);

create index idx_community_messages_channel_id on public.community_messages using btree (channel_id);
create index idx_community_messages_timestamp on public.community_messages using btree ("timestamp");
```

#### Table 8: `community_messages_clean` (filtered output)

```sql
create table public.community_messages_clean (
  id bigserial not null,
  message_id text not null,
  channel_id text null,
  user_id text null,
  username text null,
  content text null,
  timestamp timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  constraint community_messages_clean_pkey primary key (id),
  constraint community_messages_clean_message_id_key unique (message_id)
);

create index idx_community_messages_clean_message_id on public.community_messages_clean using btree (message_id);
create index idx_community_messages_clean_channel_timestamp on public.community_messages_clean using btree (channel_id, "timestamp");
```

#### Table 9: `message_ingestion_state` (cursor tracking)

```sql
create table public.message_ingestion_state (
  channel_id text not null,
  last_message_id text null,
  last_processed_at timestamp with time zone null default now(),
  constraint message_ingestion_state_pkey primary key (channel_id)
);
```

#### Table 10: `pipeline_clusters`

```sql
create table public.pipeline_clusters (
  id bigserial not null,
  batch_id text not null,
  cluster_id integer not null,
  start_timestamp timestamp with time zone null,
  end_timestamp timestamp with time zone null,
  message_count integer not null default 0,
  unique_users integer not null default 0,
  avg_boundary_score double precision null,
  created_at timestamp with time zone null default now(),
  topic_label text null,
  processing_date date not null,
  constraint pipeline_clusters_pkey primary key (id)
);

create index idx_pipeline_clusters_batch_id on public.pipeline_clusters using btree (batch_id);
create index idx_pipeline_clusters_processing_date on public.pipeline_clusters using btree (processing_date);
```

#### Table 11: `pipeline_cluster_messages`

```sql
create table public.pipeline_cluster_messages (
  id bigserial not null,
  batch_id text not null,
  cluster_id integer not null,
  message_id text not null,
  context_block_id text not null,
  channel_id text null,
  user_id text null,
  created_at timestamp with time zone null default now(),
  processing_date date not null,
  constraint pipeline_cluster_messages_pkey primary key (id)
);

create index idx_pipeline_cluster_messages_batch_id on public.pipeline_cluster_messages using btree (batch_id);
create index idx_pipeline_cluster_messages_message_id on public.pipeline_cluster_messages using btree (message_id);
create index idx_pipeline_cluster_messages_processing_date on public.pipeline_cluster_messages using btree (processing_date);
```

#### Table 12: `pipeline_topic_summaries`

```sql
create table public.pipeline_topic_summaries (
  id bigserial not null,
  batch_id text not null,
  cluster_id integer not null,
  topic_label text not null,
  summary text not null,
  key_issues jsonb null default '[]'::jsonb,
  unanswered_questions jsonb null default '[]'::jsonb,
  sentiment text null,
  severity text null,
  message_count integer not null default 0,
  unique_users integer not null default 0,
  messages_per_hour double precision null,
  start_timestamp timestamp with time zone not null,
  end_timestamp timestamp with time zone not null,
  llm_model text null default '@cf/meta/llama-3.3-70b-instruct-fp8-fast'::text,
  llm_tokens_used integer null,
  created_at timestamp with time zone null default now(),
  processing_date date not null,
  constraint pipeline_topic_summaries_pkey primary key (id)
);

create index idx_pipeline_topic_summaries_batch_id on public.pipeline_topic_summaries using btree (batch_id);
create index idx_pipeline_topic_summaries_topic_label on public.pipeline_topic_summaries using btree (topic_label);
create index idx_pipeline_topic_summaries_created_at on public.pipeline_topic_summaries using btree (created_at desc);
create index idx_pipeline_topic_summaries_sentiment on public.pipeline_topic_summaries using btree (sentiment);
create index idx_pipeline_topic_summaries_severity on public.pipeline_topic_summaries using btree (severity);
create index idx_pipeline_topic_summaries_processing_date on public.pipeline_topic_summaries using btree (processing_date);
```

### 2.3 Configure Row Level Security (RLS)

The bot uses the **Service Role Key** which bypasses RLS. However, if you plan to expose any data via Supabase's auto-generated APIs or dashboards, enable RLS policies:

```sql
-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.issues enable row level security;
alter table public.issue_messages enable row level security;
alter table public.status_log enable row level security;
alter table public.bot_config enable row level security;
alter table public.departments enable row level security;
alter table public.community_messages enable row level security;
alter table public.community_messages_clean enable row level security;
alter table public.message_ingestion_state enable row level security;
alter table public.pipeline_clusters enable row level security;
alter table public.pipeline_cluster_messages enable row level security;
alter table public.pipeline_topic_summaries enable row level security;

-- Allow service role full access (bypass)
create policy "Service role full access" on public.users for all using (true);
create policy "Service role full access" on public.issues for all using (true);
create policy "Service role full access" on public.issue_messages for all using (true);
create policy "Service role full access" on public.status_log for all using (true);
create policy "Service role full access" on public.bot_config for all using (true);
create policy "Service role full access" on public.departments for all using (true);
create policy "Service role full access" on public.community_messages for all using (true);
create policy "Service role full access" on public.community_messages_clean for all using (true);
create policy "Service role full access" on public.message_ingestion_state for all using (true);
create policy "Service role full access" on public.pipeline_clusters for all using (true);
create policy "Service role full access" on public.pipeline_cluster_messages for all using (true);
create policy "Service role full access" on public.pipeline_topic_summaries for all using (true);
```

### 2.4 Deploy Supabase Edge Functions

Three edge functions run on Supabase's Deno runtime, triggered by pg_cron. They handle message cleaning, pipeline execution, and data retention.

#### Deploy the cleaning-cron function

```bash
# From project root
supabase functions deploy cleaning-cron --project-ref <your-project-ref>
```

This function:
- Fetches raw messages from `community_messages` in batches of 500
- Filters noise: URLs only, emoji-only, commands (`/`, `!`, `.`), low-effort (`gg`, `lol`, `+1`), duplicates
- Normalizes text: strips Discord markdown, mentions, custom emoji, collapses whitespace
- Inserts cleaned messages into `community_messages_clean`

#### Deploy the pipeline-cron function

```bash
supabase functions deploy pipeline-cron --project-ref <your-project-ref>
```

This function:
- Fetches cleaned messages from `community_messages_clean`
- Runs TextTiling boundary detection (embeds messages, computes cosine similarity, finds topic shifts)
- Classifies segments using Cloudflare LLM (Llama 3.3 70B)
- Stores results to `pipeline_clusters`, `pipeline_cluster_messages`, `pipeline_topic_summaries`

**Required env vars for this function** (set in Supabase Dashboard → Edge Functions → Secrets):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CF_ACCOUNT_ID`
- `CF_API_TOKEN`

#### Deploy the retention-cleanup function

```bash
supabase functions deploy retention-cleanup --project-ref <your-project-ref>
```

This function:
- Deletes raw messages from `community_messages` older than 2 days that have already been cleaned
- Prevents the raw messages table from growing indefinitely
- Runs daily

### 2.5 Set Up pg_cron Jobs

pg_cron is a PostgreSQL extension that runs SQL queries on a schedule. Supabase includes it by default. Enable and configure it in the SQL Editor:

```sql
-- Enable the pg_cron extension
create extension if not exists pg_cron schema extensions;

-- Run cleaning-cron every 5 minutes
select cron.run_schedule(
  'cleaning-cron',
  $$
    select net.http_post(
      url := current_setting('supabase.settings_url') || '/functions/v1/cleaning-cron',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('supabase.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    )
  $$,
  '*/5 * * * *'  -- Every 5 minutes
);

-- Run pipeline-cron every 12 hours
select cron.run_schedule(
  'pipeline-cron',
  $$
    select net.http_post(
      url := current_setting('supabase.settings_url') || '/functions/v1/pipeline-cron',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('supabase.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    )
  $$,
  '0 */12 * * *'  -- Every 12 hours
);

-- Run retention-cleanup daily at 3 AM UTC
select cron.run_schedule(
  'retention-cleanup',
  $$
    select net.http_post(
      url := current_setting('supabase.settings_url') || '/functions/v1/retention-cleanup',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('supabase.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    )
  $$,
  '0 3 * * *'  -- Daily at 3 AM UTC
);
```

> **Important:** The exact pg_cron invocation above uses `net.http_post` which requires the `supabase-net` extension. If your Supabase plan doesn't include HTTP from SQL, an alternative is to use external schedulers (e.g., GitHub Actions, cron-job.org) that call the edge function URLs directly.

**Alternative: External cron calls**

If pg_cron HTTP is unavailable, set up external cron jobs that call:
- `https://<your-project>.supabase.co/functions/v1/cleaning-cron` (every 5 min)
- `https://<your-project>.supabase.co/functions/v1/pipeline-cron` (every 12 hours)
- `https://<your-project>.supabase.co/functions/v1/retention-cleanup` (daily)

Each call must include header: `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`

---

## Step 3: Qdrant Vector Database Setup

### 3.1 Create Qdrant Instance

1. Go to [Qdrant Cloud](https://cloud.qdrant.io/)
2. Sign up / log in
3. Click **"Create Cluster"** → Choose **Free tier** (1 node, 1GB RAM)
4. Pick a region close to your Railway deployment (reduces latency)
5. Once created, go to **Dashboard → API Keys**
6. Click **"Create API Key"** → Give it a name → Copy the key
7. Record these values:
   - **QDRANT_URL**: Your cluster URL (e.g., `https://xxxxx-xxxxx.cloud.qdrant.io`)
   - **QDRANT_API_KEY**: The API key you just created

### 3.2 Collections Created Automatically

The bot automatically creates these Qdrant collections on startup (in `lib/qdrant.js` → `initCollections()`). **You do NOT need to create them manually.** The bot handles this:

| Collection | Purpose | Vector Size | Distance |
|-----------|---------|-------------|----------|
| `docs_chunks` | Documentation chunks ingested from `/docs` folder | 1024 | Cosine |
| `resolved_cases` | Historical resolved support cases for RAG retrieval | 1024 | Cosine |
| `tribal_knowledge` | Team knowledge base (informal tips, workarounds) | 1024 | Cosine |
| `community_knowledge` | Community-sourced knowledge | 1024 | Cosine |
| `pipeline_contexts` | Semantic context blocks from the pipeline (community message analysis) | 1024 | Cosine |

**Vector size**: All collections use 1024-dimensional vectors from Cloudflare's BGE-large-en-v1.5 embedding model.

**What happens if a collection doesn't exist:** The bot calls `ensureCollection()` on startup, which checks if the collection exists via `getCollection()`. If it doesn't, it creates it with `vectors: { size: 1024, distance: 'Cosine' }`. If the collection exists with a different vector size, you'll get an error — in that case, delete and recreate it.

**What happens if QDRANT_URL or QDRANT_API_KEY is wrong:**
- All vector operations (embedding upserts, searches, reranking) fail
- The RAG pipeline cannot retrieve documentation or historical cases
- The bot will fall back to escalation-only behavior (every question goes to human staff)
- The pipeline crashes on startup with: `"Missing required environment variables: QDRANT_URL, QDRANT_API_KEY"`

---

## Step 4: Cloudflare Workers AI Setup

The bot uses Cloudflare Workers AI for all LLM operations — embeddings, chat classification, and reranking. This is chosen over OpenAI/Anthropic because it's free and has no per-request billing.

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages** → **Overview**
3. Record your **Account ID** from the right sidebar → `CF_ACCOUNT_ID`
4. Go to **User Profile → API Tokens** → **"Create Token"**
5. Use the **"Edit Cloudflare Workers"** template, or create a custom token with:
   - **Permissions**: `Workers AI:Read`, `Workers Scripts:Read`
6. Copy the generated token → `CF_API_TOKEN`

**Models used:**
- Embeddings: `@cf/baai/bge-large-en-v1.5` (1024-dim vectors)
- Chat/Classification: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
- Reranking: `@cf/baai/bge-reranker-base`

**What happens if CF_ACCOUNT_ID is wrong:** All Cloudflare API URLs become `https://api.cloudflare.com/client/v4/accounts/undefined/ai/run/...` → every call returns HTTP 404. The bot's intent classification, query rewriting, response generation, and pipeline embedding/classification all break.

**What happens if CF_API_TOKEN is wrong/expired:** Every Cloudflare AI call returns HTTP 401 Unauthorized. The bot cannot classify intent, cannot rewrite queries, cannot generate responses, and the pipeline cannot embed messages or classify topics.

---

## Step 5: Redis Setup

Redis serves two critical functions:
1. **BullMQ job queue** — Handles issue forwarding, notifications, reminders asynchronously
2. **Distributed locking** — Prevents concurrent pipeline runs, tracks batch processing state

### Option A: Redis on Railway (Recommended)

1. In your Railway project, click **"New"** → **"Database"** → **"Add Redis"**
2. Railway automatically provisions Redis and generates connection variables
3. Record the **Redis password** from Railway's Variables tab
4. The bot connects via `REDIS_URL` which Railway auto-injects, or you can construct it:

```
REDIS_URL=redis://default:<REDIS_PASSWORD>@<RAILWAY_REDIS_HOST>:<RAILWAY_REDIS_PORT>
```

Railway provides these internal variables:
- `REDISHOST` / `RAILWAY_PRIVATE_DOMAIN` — The internal hostname
- `REDISPORT` — The port (usually 6379)
- `REDISUSER` — Always `default` for Railway Redis
- `REDIS_PASSWORD` — The password you set

### Option B: External Redis (Upstash, Redis Cloud, etc.)

If you prefer an external Redis provider:

1. Create a Redis instance on Upstash/Redis Cloud
2. Copy the connection URL → `REDIS_URL`
3. Ensure the Redis instance allows connections from Railway's IP range

**What happens if REDIS_URL is missing or wrong:**
- **Bot side**: `lib/queue.js` falls back to `redis://localhost:6379`. On Railway (no local Redis), all BullMQ queue operations fail — issue forwarding, notifications, and reminders stop working. The bot still responds to messages in threads, but background jobs are broken.
- **Pipeline side**: `pipeline/src/batchTracker.js` runs in "degraded mode" — no distributed lock (concurrent runs possible), no dedup, no incremental tracking. The pipeline processes ALL messages every run instead of only new ones since the last batch. This increases Cloudflare API costs and processing time significantly.

---

## Step 6: Ingest Documentation Files

Before the bot can answer support questions via RAG, you must populate the `docs_chunks` Qdrant collection with your documentation.

### Prepare Documentation Files

1. Create a `docs/` folder in the project root (if it doesn't exist)
2. Add `.md` (Markdown) or `.txt` (plain text) files with your documentation

### Documentation Format (Markdown)

The ingestion script (`scripts/ingest.js`) expects a specific format for optimal retrieval:

```markdown
# Document Title — Knowledge Base

---

## How do I reset my API key?

**Problem description:**
Users need to regenerate their API key when it's compromised or expired.

**Solution:**
1. Go to the Dashboard → Settings → API Keys
2. Click "Regenerate Key"
3. Copy the new key and update your client configuration
4. The old key is immediately invalidated

---

## What are the rate limits?

**Problem description:**
Users hitting 429 errors need to understand their plan's rate limits.

**Solution:**
Free plan: 100 requests/hour
Pro plan: 1000 requests/hour
Max plan: 5000 requests/hour

See the [Pricing Page](https://example.com/pricing) for details.
```

**How chunking works:**
- The parser splits on `##` headers — each section becomes one chunk
- Each section's **question + problem description** is embedded (this is what users say)
- The **full section + solution** is stored in the payload (this is what the LLM reads)
- Chunks are capped at 300 words; longer sections are sub-split by paragraphs
- Sections under 60 characters are skipped (too short to be useful)

### Run Ingestion

```bash
# From project root
node scripts/ingest.js
```

**What this does:**
1. Reads all `.md` and `.txt` files from `docs/`
2. Parses and chunks them according to the schema above
3. Embeds each chunk using Cloudflare AI (BGE-large, 1024-dim)
4. Upserts all vectors into the `docs_chunks` Qdrant collection
5. Resets the collection before ingestion to prevent duplicates on re-run

**Output example:**
```
Starting doc ingestion...
Qdrant URL:  https://xxxxx.cloud.qdrant.io
CF Account:  set
CF Token:    set

Found 3 file(s): api-guide.md, billing-faq.md, troubleshooting.md

Ingesting: api-guide.md (4520 chars)
  → 12 chunks
  → Embedding batch 1/1 (12 chunks)...
  → Dimensions: 1024 ✓
  → Upserted 12 points ✓

─── Ingestion Summary ───────────────────────────────
  ✓ api-guide.md: 12 chunks
  ✓ billing-faq.md: 8 chunks
  ✓ troubleshooting.md: 15 chunks

  Total: 35 chunks across 3 file(s)
```

**When to re-run ingestion:**
- After adding new documentation files to `docs/`
- After updating existing documentation (the script resets the collection, so it's safe to re-run)
- After changing the embedding model (vectors become incompatible)

**What happens if you skip this step:** The `docs_chunks` collection is created but stays empty. When the bot's RAG pipeline searches for documentation, it finds zero results. The bot can still answer from `resolved_cases` (historical cases), `tribal_knowledge`, and `community_knowledge` if those collections are populated, but without docs, most answers are ungrounded and the bot escalates to human staff.

---

## Step 7: Railway Deployment

### 7.1 Connect Repository

1. Push your code to a GitHub repository
2. Go to [Railway](https://railway.app/) → **"New Project"** → **"Deploy from GitHub repo"**
3. Select your repository
4. Railway auto-detects Node.js from `package.json`

### 7.2 Configure Environment Variables

Go to your Railway service → **Variables** tab → Add each variable below. Railway encrypts and stores these securely.

> **⚠️ Never commit `.env` files to your repository.** Use Railway's secret variables feature exclusively.

### 7.3 Configure Redis on Railway

1. In the same Railway project, click **"New"** → **"Database"** → **"Add Redis"**
2. Railway creates a Redis service and links it to your bot service
3. In the Redis service's **Variables** tab, note:
   - `REDIS_PASSWORD` — The password you configured
   - `REDISHOST` / `RAILWAY_PRIVATE_DOMAIN` — Internal hostname
   - `REDISPORT` — Port (usually `6379`)
4. In your bot service's **Variables**, set:

```
REDIS_URL=redis://default:${{REDIS_PASSWORD}}@${{REDISHOST}}:${{REDISPORT}}
```

Railway automatically substitutes `${{VARIABLE_NAME}}` with values from linked services.

### 7.4 Deploy

1. Railway auto-deploys on every push to the connected branch
2. Or trigger a manual deploy from the Railway dashboard
3. Monitor the **Deployments** tab for build logs
4. Check the **Logs** tab for runtime output

**First startup sequence:**
1. Bot logs in to Discord → `Bot online`
2. Qdrant collections initialized (created if missing)
3. BullMQ workers started
4. Message ingestion system initialized
5. Pipeline runs once (after 60-second delay) if `AUTO_RUN_PIPELINE=true`
6. Slash commands are NOT auto-deployed — run locally:

```bash
# On your local machine (not Railway)
node deploy-commands.js
```

This registers slash commands (`/report`, `/status`, `/myissues`, etc.) with your Discord guild. You only need to do this once, or when you add/modify commands.

---

## Step 8: Post-Deployment Verification

After deployment, verify each component:

### 1. Bot Connectivity
```
Check: Bot appears online in Discord server
If not: Check DISCORD_TOKEN, INTENTS enabled in Developer Portal
```

### 2. Slash Commands
```
Type: /report in any channel
Expected: Modal form appears with title/description/steps fields
If not: Run node deploy-commands.js locally with correct CLIENT_ID, GUILD_ID, DISCORD_TOKEN
```

### 3. Issue Creation
```
Type: /report → Fill form → Submit
Expected: 
  - Forum post created in BAD_REPORT_CHANNEL_ID
  - Thread created with issue summary
  - Role pinged (if ROLE_* configured)
  - Ephemeral confirmation with issue ID
If not: Check BAD_REPORT_CHANNEL_ID, SUPABASE_URL, SUPABASE_SERVICE_KEY
```

### 4. RAG Response
```
In the issue thread, type a question that should match your docs
Expected: Bot responds with an answer grounded in documentation
If not: Check QDRANT_URL, QDRANT_API_KEY, CF_ACCOUNT_ID, CF_API_TOKEN, and verify docs are ingested
```

### 5. Department Routing
```
Create an issue with billing keywords (payment, charge, refund)
Expected: Issue assigned to "billing" department, billing role pinged
If not: Check departments table has billing row with keywords, ROLE_BILLING is set
```

### 6. Pipeline Execution
```
Trigger: npm run pipeline (manually) or wait for scheduled run
Expected:
  - Logs show "Running scheduled pipeline..."
  - Messages fetched from community_messages_clean
  - Segments detected via TextTiling
  - Classifications stored to pipeline_clusters
Expected result in Supabase: New rows in pipeline_clusters, pipeline_cluster_messages, pipeline_topic_summaries
If not: Check SUPABASE_URL, SUPABASE_SERVICE_KEY, CF_ACCOUNT_ID, CF_API_TOKEN, QDRANT_URL, QDRANT_API_KEY
```

### 7. Message Ingestion
```
Post a message in a channel listed in INGESTION_CHANNELS
Expected: Message appears in community_messages table within seconds, then in community_messages_clean within 5 minutes (cleaning-cron)
If not: Check INGESTION_CHANNELS includes the channel ID, INTENTS enabled, bot has View Channels permission
```

---

## Complete Environment Variable Reference

This section documents **every environment variable** the system uses, what it controls, what happens when it's missing or misconfigured, and whether it's required.

### Category 1: Discord Authentication

#### `DISCORD_TOKEN`
- **What it is**: The authentication token for your Discord bot, generated in the Discord Developer Portal.
- **Where it's used**: `index.js` (bot login), `deploy-commands.js` (REST API for command registration)
- **Required**: Yes — the bot cannot start without it.
- **If missing**: `client.login()` throws `TOKEN_INVALID` error, process crashes immediately.
- **If wrong/expired**: Same as missing — the token must be valid. Regenerate it in Developer Portal if compromised.
- **How to get it**: Discord Developer Portal → Your Application → Bot → Reset Token

#### `CLIENT_ID`
- **What it is**: Your Discord application's numeric ID, used to identify the bot when registering slash commands.
- **Where it's used**: `deploy-commands.js` (constructs the route `Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)`)
- **Required**: Yes — for slash command deployment only.
- **If missing**: Command registration fails with an invalid URL error.
- **If wrong**: Commands are registered to the wrong application — Discord won't show them.
- **How to get it**: Discord Developer Portal → Your Application → OAuth2 → Client ID

#### `GUILD_ID`
- **What it is**: The numeric ID of your Discord server (guild). Commands are registered guild-scoped (not global) for instant availability.
- **Where it's used**: `deploy-commands.js` (constructs the route for guild-specific command registration)
- **Required**: Yes — for slash command deployment only.
- **If missing**: Command registration fails with an invalid URL error.
- **If wrong**: Commands are registered to the wrong server — they won't appear in your target server.
- **How to get it**: Right-click server name in Discord → Copy ID (requires Developer Mode)

### Category 2: Supabase Database

#### `SUPABASE_URL`
- **What it is**: The base URL of your Supabase project (e.g., `https://xxxxx.supabase.co`).
- **Where it's used**: `lib/supabase.js` (creates Supabase client for bot operations), `pipeline/src/fetchMessages.js` (fetches cleaned messages), `pipeline/src/storeResults.js` (stores pipeline results)
- **Required**: Yes — all database operations depend on it.
- **If missing**: The Supabase client is created with `undefined` URL. Every database query throws an error. Issues can't be created, messages can't be saved, the pipeline can't fetch or store data.
- **If wrong**: Same as missing — all HTTP requests fail with connection errors.
- **How to get it**: Supabase Dashboard → Project Settings → API → Project URL

#### `SUPABASE_SERVICE_KEY`
- **What it is**: The service role key for your Supabase project. This key bypasses Row Level Security (RLS) and has full read/write access to all tables.
- **Where it's used**: `lib/supabase.js` (creates Supabase client), `pipeline/src/fetchMessages.js` (reads cleaned messages), `pipeline/src/storeResults.js` (writes pipeline results)
- **Required**: Yes — all database writes require service role permissions.
- **If missing**: The Supabase client is created with `undefined` key. Every database write returns 401 Unauthorized.
- **If wrong**: Same as missing — authentication fails for all queries.
- **⚠️ Security**: Never expose this key in client-side code or public repositories. Use only in server-side code (Railway, edge functions).
- **How to get it**: Supabase Dashboard → Project Settings → API → Service Role Key (secret)

#### `SUPABASE_KEY`
- **What it is**: The anon (public) key for your Supabase project. Has limited permissions based on RLS policies.
- **Where it's used**: Referenced in some ingestion paths, used by client-side operations that don't need full service role access.
- **Required**: No — the bot primarily uses `SUPABASE_SERVICE_KEY`.
- **If missing**: No impact on core bot functionality.
- **If wrong**: Client-side operations that depend on it may fail, but the bot's server-side operations are unaffected.
- **How to get it**: Supabase Dashboard → Project Settings → API → Anon Key (public)

### Category 3: Qdrant Vector Database

#### `QDRANT_URL`
- **What it is**: The base URL of your Qdrant Cloud cluster (e.g., `https://xxxxx-xxxxx.cloud.qdrant.io`).
- **Where it's used**: `lib/qdrant.js` (creates Qdrant client for RAG search), `pipeline/src/qdrantClient.js` (creates Qdrant client for pipeline context upserts), `scripts/ingest.js` (upserts documentation vectors)
- **Required**: Yes — all vector operations depend on it.
- **If missing**: The Qdrant client is created with `undefined` URL. Every vector search, upsert, and collection operation fails with connection errors.
  - **Bot impact**: RAG search returns nothing. Every user question that needs documentation lookup escalates to human staff.
  - **Pipeline impact**: Pipeline cannot upsert context blocks to `pipeline_contexts` collection. Semantic indexing breaks.
  - **Ingestion impact**: `node scripts/ingest.js` fails to upsert documentation vectors.
- **If wrong**: Same as missing — all requests go to an invalid URL.
- **How to get it**: Qdrant Cloud Dashboard → Your Cluster → URL in the address bar

#### `QDRANT_API_KEY`
- **What it is**: The API key for authenticating with your Qdrant Cloud cluster.
- **Where it's used**: `lib/qdrant.js` (Qdrant client authentication), `pipeline/src/qdrantClient.js` (Qdrant client authentication), `scripts/ingest.js` (Qdrant client authentication)
- **Required**: Yes — Qdrant requires API key authentication.
- **If missing**: Every Qdrant API call returns 401 Unauthorized.
- **If wrong/expired**: Same as missing — authentication fails for all operations.
- **How to get it**: Qdrant Cloud Dashboard → Your Cluster → API Keys → Create API Key

#### `QDRANT_PIPELINE_COLLECTION`
- **What it is**: The name of the Qdrant collection used by the semantic analysis pipeline to store context block embeddings.
- **Where it's used**: `index.js` (ensures collection exists on startup, defaults to `'pipeline_contexts'`), `pipeline/src/qdrantClient.js` (reads collection name from env)
- **Required**: Yes for the pipeline — the bot falls back to `'pipeline_contexts'` if missing.
- **If missing**: In `index.js`, defaults to `'pipeline_contexts'`. In the pipeline, the collection name is `undefined`, causing upsert operations to fail. The pipeline validates this as required at startup and throws an error listing it as missing.
- **If wrong**: The pipeline writes to a non-existent collection name. If `ensureCollection()` creates it, vectors go to the wrong collection and RAG retrieval from `pipeline_contexts` finds nothing.
- **Default**: `pipeline_contexts`
- **How to set**: Set to `pipeline_contexts` unless you have a specific reason to use a different name.

### Category 4: Cloudflare AI Services

#### `CF_ACCOUNT_ID`
- **What it is**: Your Cloudflare account ID, used to construct the base URL for all Workers AI API calls.
- **Where it's used**: `lib/cloudflare.js` (embeddings, chat, reranking, intent classification for the bot), `pipeline/src/embedder.js` (message embeddings), `pipeline/src/classifier.js` (topic classification), `pipeline/src/topicSummarizer.js` (topic summaries), `scripts/ingest.js` (documentation embeddings)
- **Required**: Yes — all Cloudflare AI calls depend on it.
- **If missing**: The CF base URL becomes `https://api.cloudflare.com/client/v4/accounts/undefined/ai/run/...` → every API call returns HTTP 404 (Not Found).
  - **Bot impact**: Intent classification fails → all messages are mishandled. Query rewriting fails → searches use raw user text. Response generation fails → bot cannot answer questions. Reranking fails → search results are unordered.
  - **Pipeline impact**: Embedding fails → TextTiling can't compute cosine similarity. Classification fails → segments get no topic labels. Topic summarization fails → no daily summaries.
  - **Ingestion impact**: Documentation embeddings fail → `docs_chunks` stays empty.
- **If wrong**: Same as missing — requests go to a non-existent account, returning 404.
- **How to get it**: Cloudflare Dashboard → Workers & Pages → Overview → Account ID (right sidebar)

#### `CF_API_TOKEN`
- **What it is**: The API token for authenticating with Cloudflare Workers AI services.
- **Where it's used**: `lib/cloudflare.js` (Authorization header for all AI calls), `pipeline/src/embedder.js` (embedding auth), `pipeline/src/classifier.js` (classification auth), `pipeline/src/topicSummarizer.js` (summarization auth), `scripts/ingest.js` (embedding auth)
- **Required**: Yes — all Cloudflare AI calls require authentication.
- **If missing**: Every Cloudflare API call returns HTTP 401 Unauthorized.
- **If wrong/expired**: Same as missing — authentication fails for all AI services.
- **How to get it**: Cloudflare Dashboard → User Profile → API Tokens → Create Token (Workers AI permissions)

### Category 5: Redis Job Queue

#### `REDIS_URL`
- **What it is**: The connection URL for your Redis instance, used by BullMQ for job queue operations and by the pipeline for distributed locking and batch tracking.
- **Where it's used**: `lib/queue.js` (BullMQ Queue + Worker for issue forwarding, notifications, reminders), `pipeline/src/batchTracker.js` (Redis lock for preventing concurrent pipeline runs, cursor for incremental processing)
- **Required**: No — has fallbacks, but degraded functionality.
- **If missing**:
  - **Bot side**: Falls back to `redis://localhost:6379`. On Railway (no local Redis), the connection fails. BullMQ workers can't process jobs — issue forwarding, notifications, and reminders stop working. The bot still responds to messages in threads in real-time, but background async jobs are broken.
  - **Pipeline side**: Runs in "degraded mode" — no distributed lock (concurrent pipeline runs possible if triggered multiple times), no deduplication (same messages processed multiple times), no incremental tracking (processes ALL messages every run instead of only new ones). This increases Cloudflare API costs and processing time significantly.
- **If wrong**: Same as missing — connection fails, fallbacks apply.
- **Default**: `redis://localhost:6379` (in `lib/queue.js` only; pipeline has no default)
- **How to construct**: `redis://default:<REDIS_PASSWORD>@<REDISHOST>:<REDISPORT>`

### Category 6: Discord Channels & Roles

#### `BAD_REPORT_CHANNEL_ID`
- **What it is**: The Discord channel ID of your support forum channel. This is where issue reports are created as forum posts with threads.
- **Where it's used**: `index.js` (thread auto-detection — filters `threadCreate` events to only process threads in this channel; message routing — filters `messageCreate` events to only process thread messages in this channel), `lib/forum.js` (creates forum posts for new issues via `/report` or modal)
- **Required**: No — has graceful fallbacks.
- **If missing**:
  - Thread auto-detection: The `threadCreate` handler returns early — user-created forum threads are not automatically logged as issues.
  - Message routing: The `messageCreate` handler returns early — no thread messages are processed by the bot.
  - Forum creation: Falls back to `bot_config` table's `report_channel_id` key. If that's also empty, `createReportThread()` returns `null` — no thread is created, and the user gets an error.
- **If wrong**: Bot tries to fetch a non-existent channel → error logged, no thread created.
- **How to get it**: Right-click your support forum channel in Discord → Copy ID (requires Developer Mode)

#### `INGESTION_CHANNELS`
- **What it is**: A comma-separated list of Discord channel IDs that the bot watches for message ingestion into the `community_messages` Supabase table.
- **Where it's used**: `lib/ingestion/index.js` (determines which channels to listen to for real-time message ingestion)
- **Required**: No — ingestion is disabled if empty.
- **If missing**: The ingestion system initializes with an empty channel list → no messages are ingested from any channel. The `init()` function returns early with log: `"No channels configured -- ingestion disabled"`.
- **If wrong**: Bot listens to non-existent channels → no messages are ever captured. The pipeline has no data to process.
- **Format**: Comma-separated, no spaces: `123456789,987654321,111222333`
- **How to get it**: Right-click each channel → Copy ID → join with commas

#### `ROLE_BILLING`
- **What it is**: The Discord role ID for the billing department support team.
- **Where it's used**: `lib/speaker.js` (detects if a member is billing staff), `lib/forward.js` (pings billing role in new issue threads and escalations), `lib/reminders.js` (pings billing role for stale issue reminders)
- **Required**: No — role pings are skipped if missing.
- **If missing**:
  - Staff detection: No one is recognized as billing staff. Billing team members can't use `/acknowledge`, `/resolve`, `/close` commands (permission check fails).
  - Role ping: `pingRoleInThread()` logs `"No role configured for department: billing"` and skips the ping. New billing issues get no role mention.
  - Reminders: Falls back to `ROLE_UNCLASSIFIED` if available, otherwise skips the reminder ping.
- **If wrong**: Bot tries to ping a non-existent role → Discord returns an error, ping is silently skipped.
- **How to get it**: Right-click the billing role in Discord server settings → Copy ID

#### `ROLE_TECHNICAL`
- **What it is**: The Discord role ID for the technical department support team.
- **Where it's used**: `lib/speaker.js` (detects if a member is technical staff), `lib/forward.js` (pings technical role), `lib/reminders.js` (pings technical role for stale issues)
- **Required**: No — same behavior as `ROLE_BILLING` if missing.
- **If missing**: Technical staff can't use staff-only commands. No role ping for technical issues. Reminders fall back to unclassified role.
- **How to get it**: Right-click the technical role → Copy ID

#### `ROLE_PRODUCT`
- **What it is**: The Discord role ID for the product department support team.
- **Where it's used**: `lib/speaker.js` (detects if a member is product staff), `lib/forward.js` (pings product role), `lib/reminders.js` (pings product role for stale issues)
- **Required**: No — same behavior as `ROLE_BILLING` if missing.
- **If missing**: Product staff can't use staff-only commands. No role ping for product feature requests. Reminders fall back to unclassified role.
- **How to get it**: Right-click the product role → Copy ID

#### `ROLE_UNCLASSIFIED`
- **What it is**: The fallback Discord role ID for issues that don't match any department's keywords.
- **Where it's used**: `lib/speaker.js` (detects if a member is unclassified staff), `lib/forward.js` (pings unclassified role as fallback), `lib/reminders.js` (pings unclassified role for unclassified stale issues)
- **Required**: No — same behavior as `ROLE_BILLING` if missing.
- **If missing**: Unclassified issues get no role ping. No fallback for other departments' missing roles.
- **How to get it**: Right-click the unclassified/general staff role → Copy ID

#### `DEPT_CHANNEL_BILLING`
- **What it is**: The Discord channel ID of the internal billing team's channel. Issues are forwarded here as rich embeds for staff visibility.
- **Where it's used**: `lib/forward.js` (`forwardToTeam()` sends embed to this channel for billing issues)
- **Required**: No — forwarding is skipped if missing.
- **If missing**: `forwardToTeam()` logs `"No internal channel configured for department: billing"` and skips forwarding. The issue is still created in the forum, but the billing team doesn't see it in their dedicated channel.
- **If wrong**: Bot tries to send to a non-existent channel → error logged, forwarding fails.
- **How to get it**: Right-click the billing team's internal channel → Copy ID

#### `DEPT_CHANNEL_TECHNICAL`
- **What it is**: The Discord channel ID of the internal technical team's channel.
- **Where it's used**: `lib/forward.js` (forwards technical issues as embeds)
- **Required**: No — same behavior as `DEPT_CHANNEL_BILLING` if missing.

#### `DEPT_CHANNEL_PRODUCT`
- **What it is**: The Discord channel ID of the internal product team's channel.
- **Where it's used**: `lib/forward.js` (forwards product issues as embeds)
- **Required**: No — same behavior as `DEPT_CHANNEL_BILLING` if missing.

#### `DEPT_CHANNEL_UNCLASSIFIED`
- **What it is**: The Discord channel ID of the fallback channel for unclassified issues.
- **Where it's used**: `lib/forward.js` (forwards unclassified issues here; also serves as fallback if a specific department's channel is missing)
- **Required**: No — same behavior as `DEPT_CHANNEL_BILLING` if missing.

### Category 7: Pipeline Control

#### `AUTO_RUN_PIPELINE`
- **What it is**: Controls whether the bot automatically runs the semantic analysis pipeline on startup and schedules it every 12 hours.
- **Where it's used**: `index.js` (checks `process.env.AUTO_RUN_PIPELINE !== 'false'` to decide whether to schedule pipeline)
- **Required**: No — defaults to `true` (pipeline runs).
- **If set to `true`**: On bot startup, the pipeline runs once after a 60-second delay. Then it schedules a `setInterval` to run every 12 hours.
- **If set to `false`**: Pipeline is completely disabled in the bot. Use this when you're running the pipeline via Supabase Edge Functions (pg_cron) instead of Railway. This prevents duplicate pipeline runs.
- **If missing**: Treated as `true` — pipeline runs on startup and every 12 hours.
- **Typical setup**:
  - **Pipeline on Railway**: `AUTO_RUN_PIPELINE=true`
  - **Pipeline on Supabase Edge Function**: `AUTO_RUN_PIPELINE=false`

#### `FORCE_FULL_PIPELINE`
- **What it is**: When set to `true`, wipes the Redis cursor and forces the pipeline to process ALL cleaned messages from history, ignoring the last batch timestamp.
- **Where it's used**: `pipeline/src/index.js` (checks before starting pipeline — if `true`, clears Redis cursor)
- **Required**: No — defaults to `false` (incremental mode).
- **If set to `true`**: The pipeline ignores the last batch timestamp in Redis and processes ALL messages in `community_messages_clean`. Use this for re-indexing after schema changes, after fixing pipeline bugs, or when you want to re-cluster all historical data.
- **If set to `false`**: Pipeline runs in incremental mode — only processes messages since the last batch. This is the normal operating mode.
- **If missing**: Treated as `false` — incremental mode.
- **⚠️ Warning**: Running a full pipeline on large datasets is expensive — it embeds every message, runs classification on all segments, and upserts all vectors to Qdrant. Only use when necessary.

#### `AUTO_BACKFILL`
- **What it is**: Controls whether the bot backfills missed Discord messages on startup from the last checkpoint.
- **Where it's used**: `lib/ingestion/index.js` (checks on initialization — if `true`, fetches historical messages since last processed cursor)
- **Required**: No — defaults to `true` (backfill enabled).
- **If set to `true`**: On bot startup, the ingestion system checks `message_ingestion_state` in Supabase for each configured channel. If there's a gap between the last processed message and the current channel state, it backfills the missed messages.
- **If set to `false`**: Bot only ingests new messages from the current point forward. Any messages posted while the bot was offline are lost (unless caught by the cleaning-cron edge function).
- **If missing**: Treated as `true` — backfill enabled.

#### `LIMIT_HISTORY`
- **What it is**: Controls the message fetch cap during the pipeline's "ALL" mode (first run with no time window).
- **Where it's used**: `pipeline/src/fetchMessages.js` (checks before fetching — if `'false'`, removes the 2000-message cap)
- **Required**: No — defaults to capped at 2000 messages.
- **If set to `false`**: The pipeline fetches ALL messages in `community_messages_clean` with no cap. Use this on first run if you want complete historical coverage.
- **If set to any other value or missing**: The first-run fetch is capped at the most recent 2000 messages. This protects against excessive API costs on large datasets.
- **⚠️ Note**: This only affects the "ALL" mode (first run or `FORCE_FULL_PIPELINE=true`). Incremental runs always fetch only new messages since last batch.

#### `PIPELINE_BACKFILL_HOURS`
- **What it is**: Overrides the default time window (in hours) for incremental pipeline runs. Controls how far back the pipeline looks for new messages since the last run.
- **Where it's used**: `pipeline/src/fetchMessages.js` (overrides `BATCH_WINDOW_HOURS` from pipeline config)
- **Required**: No — defaults to 12 hours (from `pipeline.config.js`).
- **If set**: Pipeline fetches messages from `N` hours ago instead of the default 12-hour window.
- **If missing**: Falls back to 12-hour batches.
- **Use case**: If your message volume is very high, you might set this to `6` to process smaller batches more frequently. If it's very low, set it to `24` to accumulate more messages per run.

### Category 8: Logging & Debug

#### `LOG_PRETTY`
- **What it is**: When set to `true`, outputs human-readable colored logs instead of JSON. Useful for debugging in Railway logs or local development.
- **Where it's used**: `index.js` (pino logger configuration)
- **Required**: No — defaults to `false` (JSON logs).
- **If set to `true`**: Logs are formatted as readable text with colors: `[INFO] Bot online — tag=Bot#1234 guilds=1`. Easier to read in Railway's log viewer.
- **If set to `false` or missing**: Logs are structured JSON: `{"level":30,"time":1234567890,"msg":"Bot online","tag":"Bot#1234","guilds":1}`. Better for log aggregation tools (Datadog, LogRocket, etc.).

#### `LOG_LEVEL`
- **What it is**: Sets the minimum log level for the pipeline's pino logger.
- **Where it's used**: `pipeline/src/logger.js` (configures pino log level)
- **Required**: No — defaults to `info`.
- **If set to `debug`**: Verbose logging — every embedding call, every classification attempt, every retry is logged. Useful for debugging pipeline issues.
- **If set to `info`**: Normal logging — pipeline start/end, batch counts, errors. Default for production.
- **If set to `warn`**: Only warnings and errors are logged. Reduces log noise.
- **If set to `error`**: Only errors are logged. Minimal log output.
- **If missing**: Defaults to `info`.

#### `NODE_ENV`
- **What it is**: The Node.js environment mode. Controls production behavior for rate limiting and log formatting.
- **Where it's used**: `lib/issues.js` (rate limit check — if not `"production"`, `isAtIssueLimit()` always returns `false`), `pipeline/src/logger.js` (if `"production"`, disables pretty-print transport for raw JSON logs)
- **Required**: No — defaults to `undefined` (non-production mode).
- **If set to `production`**: 
  - Issue rate limiting is enforced (users capped at 3 open issues from `bot_config.max_open_issues`).
  - Pipeline logs are raw JSON (for log aggregation tools).
- **If set to `development` or missing**:
  - Issue rate limiting is **disabled** — users can create unlimited open issues.
  - Pipeline logs are pretty-printed (human-readable).
- **Recommendation**: Set to `production` on Railway. Leave unset or `development` for local testing.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DISCORD GUILD                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │  General     │  │  Support     │  │  Forum       │                  │
│  │  Chat        │  │  Threads     │  │  Channel     │                  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │
│         │                 │                 │                           │
└─────────┼─────────────────┼─────────────────┼───────────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      MESSAGE INGESTION LAYER                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │ messageListener │  │ batchWriter     │  │ noiseFilters    │         │
│  │ (real-time)     │→ │ (threshold +    │→ │ (URL/emoji/     │         │
│  │                 │  │  interval flush)│  │  command filter)│         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│                          │                                              │
│                          ▼                                              │
│                  community_messages_clean (Supabase)                    │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ├──────────────────────────────────────────────────────────────┐
          │                                                              │
          ▼                                                              ▼
┌──────────────────────────┐                            ┌────────────────────────────────┐
│   SEMANTIC PIPELINE      │                            │   RAG SUPPORT BOT              │
│   (Batch - 12h interval) │                            │   (Real-time)                  │
│                          │                            │                                │
│  1. fetchMessages        │                            │  /report → createIssue         │
│  2. boundaryDetection    │                            │  /status → checkIssue          │
│     (TextTiling + cosine)│                            │  /myissues → listIssues        │
│  3. contextBuilder       │                            │                                │
│  4. embedder             │                            │  messageCreate → runAgent      │
│     (Cloudflare AI)      │                            │    ├─ intent classification    │
│  5. qdrantClient         │                            │    ├─ query rewriting          │
│     (upsert vectors)     │                            │    ├─ vector search + rerank   │
│  6. classifier           │                            │    ├─ response generation      │
│     (LLM topic labels)   │                            │    └─ escalation (if needed)   │
│  7. storeResults         │                            │                                │
│     (Supabase tables)    │                            │  Qdrant Collections:           │
│                          │                            │    - docs_chunks               │
│  Output Tables:          │                            │    - resolved_cases            │
│    - pipeline_clusters   │                            │    - tribal_knowledge          │
│    - pipeline_cluster_   │                            │    - community_knowledge       │
│      messages            │                            │                                │
└──────────────────────────┘                            └────────────────────────────────┘
```

---

## Database Schema Reference

See [Step 2.2: Create Database Tables](#22-create-database-tables) above for the complete SQL schema with all tables, constraints, and indexes.

### Table Relationships

```
users (1) ────< issues (N) ────< issue_messages (N)
                   │
                   └───< status_log (N)

departments (1) ────< issues (N)  [via keyword matching]

bot_config ──── Runtime configuration (key-value store)

community_messages ────→ [cleaning-cron] ────→ community_messages_clean
                                                        │
                                                        └───→ [pipeline-cron] ────→ pipeline_clusters
                                                                                    pipeline_cluster_messages
                                                                                    pipeline_topic_summaries

message_ingestion_state ──── Cursor tracking for each channel
```

---

## Troubleshooting

### Bot won't start

| Symptom | Cause | Fix |
|---------|-------|-----|
| `TOKEN_INVALID` error | Wrong or expired `DISCORD_TOKEN` | Regenerate token in Discord Developer Portal |
| `ETIMEDOUT` on startup | Network issue or Railway DNS problem | Check Railway service health, retry |
| Bot appears offline | Missing `MESSAGE CONTENT INTENT` | Enable in Discord Developer Portal → Bot → Privileged Gateway Intents |

### Slash commands not showing

| Symptom | Cause | Fix |
|---------|-------|-----|
| `/report` doesn't appear | Commands not registered | Run `node deploy-commands.js` locally with correct `CLIENT_ID`, `GUILD_ID`, `DISCORD_TOKEN` |
| Commands show in wrong server | Wrong `GUILD_ID` | Right-click correct server → Copy ID → update env var → re-run deploy-commands.js |
| Commands show but return errors | Missing permissions | Ensure bot has Send Messages, Manage Threads, Embed Links permissions |

### Issues not created

| Symptom | Cause | Fix |
|---------|-------|-----|
| `/report` modal submits but no thread | Wrong `BAD_REPORT_CHANNEL_ID` | Verify channel ID, ensure it's a Forum channel |
| Thread created but no role ping | Missing `ROLE_*` variables | Set the appropriate `ROLE_BILLING`, `ROLE_TECHNICAL`, etc. |
| Issue creation fails with DB error | Wrong `SUPABASE_URL` or `SUPABASE_SERVICE_KEY` | Verify credentials in Supabase Dashboard → Settings → API |

### RAG not answering

| Symptom | Cause | Fix |
|---------|-------|-----|
| Every question escalates | Empty `docs_chunks` collection | Run `node scripts/ingest.js` with docs in `/docs` folder |
| Search returns 0 results | Wrong `QDRANT_URL` or `QDRANT_API_KEY` | Verify Qdrant cluster URL and API key |
| Bot responds with wrong answers | Missing `CF_API_TOKEN` or `CF_ACCOUNT_ID` | Verify Cloudflare credentials, check token permissions |
| Reranking fails | Cloudflare reranker unavailable | Check Cloudflare Workers AI status, verify `CF_API_TOKEN` |

### Pipeline not running

| Symptom | Cause | Fix |
|---------|-------|-----|
| No pipeline logs | `AUTO_RUN_PIPELINE=false` | Set to `true` or trigger manually with `npm run pipeline` |
| Pipeline crashes on startup | Missing required env vars | Check logs for `"Missing required environment variables"` message |
| Pipeline processes 0 messages | No cleaned messages in Supabase | Verify `INGESTION_CHANNELS`, check `community_messages_clean` table |
| Pipeline runs but stores nothing | Missing `SUPABASE_SERVICE_KEY` | Verify service role key in Supabase Dashboard |

### Message ingestion not working

| Symptom | Cause | Fix |
|---------|-------|-----|
| `community_messages` table is empty | Missing `INGESTION_CHANNELS` or bot permissions | Set `INGESTION_CHANNELS`, ensure bot has View Channels + Read Message History |
| `community_messages_clean` table is empty | cleaning-cron not running | Verify edge function is deployed, pg_cron job is scheduled |
| Messages appear but are garbled | Noise filters too aggressive | Adjust noise filter patterns in `supabase/functions/cleaning-cron/index.ts` |

### Redis queue failures

| Symptom | Cause | Fix |
|---------|-------|-----|
| Issue forwarding doesn't happen | Redis connection failed | Verify `REDIS_URL`, check Railway Redis service is linked |
| Notifications not sent | BullMQ worker can't connect to Redis | Same as above — fix Redis connection |
| Pipeline runs in degraded mode | `REDIS_URL` missing or unreachable | Set correct `REDIS_URL` or accept degraded mode (processes ALL messages each run) |

---

## Quick Deployment Checklist

- [ ] Discord bot created with Message Content Intent enabled
- [ ] `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID` recorded
- [ ] Supabase project created with all 12 tables created
- [ ] `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_KEY` recorded
- [ ] Supabase edge functions deployed (`cleaning-cron`, `pipeline-cron`, `retention-cleanup`)
- [ ] pg_cron jobs configured (or external cron set up)
- [ ] Qdrant Cloud cluster created
- [ ] `QDRANT_URL`, `QDRANT_API_KEY` recorded
- [ ] Cloudflare Workers AI enabled
- [ ] `CF_ACCOUNT_ID`, `CF_API_TOKEN` recorded
- [ ] Redis provisioned (Railway Redis or external)
- [ ] `REDIS_URL` configured
- [ ] Documentation files added to `docs/` folder
- [ ] `node scripts/ingest.js` run successfully
- [ ] All environment variables set in Railway
- [ ] Bot deployed to Railway and shows as online
- [ ] `node deploy-commands.js` run locally
- [ ] `/report` command tested and working
- [ ] Test issue created and RAG response verified

---

## License

Copyright (c) 2026 Hasin Raiyan

Permission is granted to view, test, and evaluate this software for personal, educational, and internal purposes.

You are allowed to:
- Run, test, and experiment with the code freely
- Use the code for evaluation, prototyping, and internal testing

You are not allowed to:
- Deploy this software in production or integrate it into official products without prior approval
- Redistribute, sublicense, or commercially use this software without authorization

Production / Official Use:
Use of this software in any production system or official deployment requires prior agreement with the author to ensure proper alignment on usage and scope.

Attribution:
Any use of this software must include clear attribution:
*"Developed by [Hasin Raiyan](https://hasin.vercel.app/)"*

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.