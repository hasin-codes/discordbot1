# Zhipu-Fushou Discord Bot

> Built for the **Z.ai Discord Server** — RAG-powered support automation with semantic conversation analysis and intelligent issue tracking.

![Node.js](https://img.shields.io/badge/Node.js-20+-green?style=flat&logo=node.js)
![Discord.js](https://img.shields.io/badge/Discord.js-14+-blue?style=flat&logo=discord)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat&logo=supabase)
![Qdrant](https://img.shields.io/badge/Qdrant-VectorDB-orange?style=flat)
![Cloudflare AI](https://img.shields.io/badge/Cloudflare%20AI-Workers-F38020?style=flat)

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Part 1: Semantic Analysis Pipeline](#part-1-semantic-analysis-pipeline)
  - [How the Pipeline Works](#how-the-pipeline-works)
  - [Pipeline Configuration](#pipeline-configuration)
  - [Running the Pipeline](#running-the-pipeline)
- [Part 2: Discord Slash Commands & RAG Bot](#part-2-discord-slash-commands--rag-bot)
  - [Available Commands](#available-commands)
  - [RAG Architecture](#rag-architecture)
  - [Intent Classification](#intent-classification)
  - [Multi-User Thread Support](#multi-user-thread-support)
- [Part 3: Configuration & Tuning](#part-3-configuration--tuning)
  - [Environment Variables](#environment-variables)
  - [Tuning for Daily Message Volume](#tuning-for-daily-message-volume)
  - [Performance Optimization](#performance-optimization)
- [Deployment](#deployment)
- [Database Schema](#database-schema)
- [Development](#development)

---

## Overview

This system consists of three main components:

1. **Message Ingestion & Cleaning** — Real-time Discord message collection with noise filtering
2. **Semantic Analysis Pipeline** — Batch processing pipeline that detects topic boundaries and clusters conversations
3. **RAG-Powered Support Bot** — Intelligent agent that answers support questions using documentation and historical cases

### Key Features

- **Automated Issue Tracking** — `/report` command creates tracked issues with department routing
- **RAG-Based Q&A** — Retrieves answers from documentation and resolved cases using vector search + reranking
- **Multi-User Thread Support** — Detects when multiple users have different issues in the same thread
- **Semantic Clustering** — Automatically groups Discord conversations by topic using TextTiling + LLM classification
- **Escalation System** — Intelligently escalates unanswered questions to human staff with context briefs

---

## Architecture

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

## Part 1: Semantic Analysis Pipeline

The pipeline processes cleaned Discord messages to detect topic shifts and cluster conversations semantically. It runs every 12 hours on Railway (or can be triggered manually).

### The Problem

Discord support channels are a mess. A single day might have someone asking about API rate limits, another person complaining about billing, a third sharing a bug report, and ten people just vibing — all interleaved in the same channel. If you want to understand what your community is actually talking about, you can't just count keywords or split by time. A 30-minute window might contain three different conversations, and a single conversation might span two hours.

The pipeline exists to solve this: **take a flat stream of Discord messages and carve it into semantically coherent conversations, each with a topic label** — without any manual labeling or training data.

### How the Pipeline Works

#### Step 1: Fetch Messages

```javascript
// pipeline/src/fetchMessages.js
const messages = await fetchMessages(startTimeISO, endTimeISO);
```

- Reads from `community_messages_clean` table in Supabase
- Uses cursor-based pagination for incremental processing
- First run fetches ALL history; subsequent runs fetch only new messages since last batch

#### Step 2: Boundary Detection (TextTiling)

```javascript
// pipeline/src/boundaryDetection.js
const segments = await detectBoundariesPipeline(messages);
```

**Algorithm:**
1. Embed each message individually using Cloudflare Workers AI (`@cf/baai/bge-large-en-v1.5`)
2. Compute cosine similarity curve using sliding window (k=3 messages per side)
3. Calculate depth scores (distance from neighboring peaks)
4. Apply threshold (0.15) to detect topic boundaries
5. Enforce min/max segment constraints (3-80 messages)

**Why this matters:** Naive sliding windows blend unrelated topics (API errors + billing questions + random chat). TextTiling detects where topics actually shift, producing semantically coherent segments.

#### Step 3: Context Block Construction

```javascript
// pipeline/src/contextBuilder.js
const contextBlocks = buildContextBlocks(segments);
```

- Builds overlapping windows of 3 messages within each segment
- Never crosses segment boundaries (preserves topic coherence)
- Each block is embedded as a single unit for better semantic representation

#### Step 4: Embedding & Qdrant Upsert

```javascript
// pipeline/src/embedder.js + qdrantClient.js
const embeddedBlocks = await embedContextBlocks(contextBlocks);
await qdrantClient.upsertBlocks(validBlocks, batchId);
```

- Embeds context blocks using Cloudflare Workers AI
- Upserts to Qdrant `pipeline_contexts` collection for RAG retrieval
- Batch processing with configurable concurrency (default: 10)

#### Step 5: LLM Classification

```javascript
// pipeline/src/classifier.js
const classifications = await classifyPipeline(segments);
```

**Two-pass approach:**

1. **Category Discovery** — Sample 15 segments, ask LLM to discover natural topic categories (8-15 categories)
2. **Batch Classification** — Classify all segments into discovered categories in batches of 10

**Model:** `@cf/meta/llama-3.3-70b-instruct-fp8-fast`

#### Step 6: Store Results

```javascript
// pipeline/src/storeResults.js
await storeSegmentClassifications(classifications, segments, batchId, processingDate);
```

Writes to Supabase tables:
- `pipeline_clusters` — One row per detected cluster per batch
- `pipeline_cluster_messages` — Message-cluster links
- `pipeline_topic_summaries` — Daily topic summaries (optional)

### Design Decisions

#### Why TextTiling instead of time-window chunking?

Time-window chunking (e.g., "split every 30 minutes") is simple but wrong — conversations don't follow clocks. A quick question gets its own 30-minute bucket even if it's one message, while a deep debugging session gets sliced in half at the 30-minute mark.

We use **TextTiling** — an algorithm from NLP research that detects topic shifts by looking at semantic similarity between messages. It embeds each message, computes a similarity curve, and finds the valleys (where the topic changes). The result: segments that match how humans would naturally group a conversation.

*Alternative considered:* HDBSCAN clustering on embeddings. We tried this initially — it required a Python subprocess (hdbscan, numpy, scikit-learn) and produced inconsistent cluster counts depending on hyperparameters. TextTiling is deterministic, runs in pure JavaScript, and produces segments with clear boundaries that the LLM can then label reliably.

#### Why two-pass LLM classification instead of zero-shot?

The naive approach: send each segment to an LLM and ask "what topic is this?" The problem: without a fixed label set, the LLM might call the same topic "API Issues" in one batch and "API Problems" in another. Labels drift, and your database becomes useless for aggregation.

Our approach:
1. **Pass 1 — Category Discovery:** Sample 15 representative segments, ask the LLM to find natural topic categories (it returns 8-15 labels). This is a one-time cost per run.
2. **Pass 2 — Batch Classification:** Classify every segment using the fixed label set from pass 1.

This guarantees consistent labels across the entire dataset, makes category counts meaningful, and costs roughly the same as zero-shot (the discovery pass is tiny).

#### Why Cloudflare Workers AI instead of OpenAI/Anthropic?

Cost and latency. This system processes thousands of messages per run — every embedding call, every classification call, every rerank goes through an LLM. Using OpenAI would cost real money per run. Cloudflare Workers AI provides:

- **BGE-large-en-v1.5** for embeddings (1024-dim, competitive with OpenAI's text-embedding-3-small)
- **Llama 3.3 70B** for classification (competitive with GPT-4 for short-label tasks)
- **BGE-reranker-base** for reranking

All on the free tier with no API key billing. The tradeoff: models are slightly less capable than frontier models, but for this use case (short message classification, not creative writing), the difference is negligible.

### Pipeline Configuration

All tunable parameters are in `pipeline/pipeline.config.js`:

```javascript
const PIPELINE_CONFIG = {
  // TextTiling parameters
  BOUNDARY_WINDOW_SIZE: 3,              // Messages per side of boundary candidate
  BOUNDARY_DEPTH_THRESHOLD: 0.15,       // Minimum depth score to declare boundary
  BOUNDARY_SMOOTHING_WINDOW: 3,         // Moving average window for depth scores

  // Segment constraints
  MIN_SEGMENT_SIZE: 3,                  // Discard smaller segments
  MAX_SEGMENT_SIZE: 80,                 // Force-split larger segments

  // Context block construction
  CONTEXT_WINDOW_SIZE: 3,               // Messages per context block
  CONTEXT_WINDOW_STEP: 1,               // Step size for overlapping windows

  // Embedding
  EMBEDDING_BATCH_SIZE: 100,
  EMBEDDING_CONCURRENCY: 10,
  EMBEDDING_BATCH_DELAY_MS: 300,
  EMBEDDING_RETRY_BASE_MS: 200,
  EMBEDDING_MAX_RETRIES: 3,

  // LLM Classifier
  CHAT_MODEL: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  CLASSIFIER_SAMPLE_SIZE: 15,           // Segments for category discovery
  CLASSIFIER_PREVIEW_MESSAGES: 20,      // Max messages per segment in prompt
  CLASSIFIER_BATCH_SIZE: 10,            // Segments per classification API call
  CLASSIFIER_BATCH_DELAY_MS: 500,
  CLASSIFIER_MAX_RETRIES: 3,
  CLASSIFIER_RETRY_BASE_MS: 500,

  // Qdrant
  QDRANT_UPSERT_BATCH_SIZE: 100,
  QDRANT_RETRY_COUNT: 5,
  QDRANT_RETRY_DELAY_MS: 1000,

  // Pipeline scheduling
  BATCH_WINDOW_HOURS: 12,               // Run interval
  FETCH_CHUNK_SIZE: 1000,

  // Redis lock
  LOCK_TTL_SECONDS: 900,                // 15 minutes
  LOCK_KEY: 'pipeline:semantic:lock',
};
```

### Running the Pipeline

#### Manual Execution

```bash
# Run pipeline once
npm run pipeline

# Or directly
node pipeline/src/index.js
```

#### Scheduled Execution (Railway)

The pipeline is configured to run every 12 hours automatically on Railway:

```javascript
// index.js
setInterval(async () => {
  await runPipeline();
}, 12 * 60 * 60 * 1000); // 12 hours
```

Control via environment variable:
```bash
AUTO_RUN_PIPELINE=true   # Enable automatic runs (default)
AUTO_RUN_PIPELINE=false  # Disable automatic runs
```

#### First Run vs Incremental

- **First run:** Processes ALL existing messages in `community_messages_clean`
- **Subsequent runs:** Only processes messages since last batch (tracked in Redis)

Force full reprocessing:
```bash
FORCE_FULL_PIPELINE=true
```

#### Supabase Edge Function Alternative

The pipeline can also run as a Supabase Edge Function (triggered by pg_cron):

```bash
# supabase/functions/pipeline-cron/index.ts
# Triggered every 12 hours via pg_cron
```

See `sql/setup_cron_jobs.sql` for cron schedule configuration.

---

## Part 2: Discord Slash Commands & RAG Bot

### Available Commands

| Command | Description | Permissions |
|---------|-------------|-------------|
| `/report` | Create a new support issue via modal form | Everyone |
| `/status <ISS-XXXX>` | Check status of a specific issue | Everyone |
| `/myissues` | List all your open issues | Everyone |
| `/acknowledge <ISS-XXXX>` | Mark issue as acknowledged (staff only) | Staff |
| `/resolve <ISS-XXXX>` | Mark issue as resolved (staff only) | Staff |
| `/close <ISS-XXXX>` | Close an issue permanently (staff only) | Staff |
| `/debug <ISS-XXXX>` | View debug information for an issue | Admin |
| `/ping` | Check bot latency | Everyone |

### RAG Architecture

The bot uses a 4-layer RAG pipeline for answering support questions:

```
User Message
     │
     ▼
┌─────────────────────────┐
│ Layer 1: Intent         │
│ Classification          │
│ (CASUAL/QUESTION/       │
│  COMPLAINT/STATUS)      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Layer 2: Context        │
│ Assembly                │
│ (Anchors + Sliding      │
│  Window + System msgs)  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Layer 3: Query          │
│ Rewriting               │
│ (Extract searchable     │
│  core, preserve terms)  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Layer 4: Response       │
│ Generation              │
│ (LLM + RAG context)     │
└─────────────────────────┘
```

#### Layer 1: Intent Classification

```javascript
// lib/intent.js
const { intent, messageType } = await classifyIntent(userMessage);
```

**Intents:**
- `CASUAL` — Greetings, thanks, acknowledgements
- `QUESTION` — Product features, pricing, how-to
- `COMPLAINT` — Bug reports, frustration
- `STATUS` — Issue status inquiries
- `UNCLEAR` — Vague or ambiguous messages

**Message Types:**
- `question` — New inquiry
- `followup` — References earlier discussion
- `comment` — Statement without question
- `acknowledgement` — Confirmation (no reply needed)

#### Layer 2: Context Assembly

```javascript
// lib/memory.js
const context = await fetchContext(issue);
```

**Strategy:**
- **Anchor messages:** First 2 messages (original report + bot ack) — never lost
- **Recent messages:** Sliding window of last 10 messages
- **System messages:** Escalations, status changes (always included)
- **Gap marker:** Indicates omitted messages if history is long

#### Layer 3: Query Rewriting

```javascript
// lib/rewriter.js
const { query, needsRag } = await rewriteQuery(userMessage, context.history, intent);
```

**Decision rules (no search):**
- User asking about ticket status/timeline
- Question already answered in conversation
- Greeting or acknowledgement

**Query generation rules:**
- Preserve: Error codes, product terms, feature names, technical terms
- Strip: Emotion, filler words, pleasantries, redundancy
- Length: 4-12 words maximum

#### Layer 4: Response Generation

```javascript
// lib/responder.js
const answer = await generateResponse(question, ragResults, context, needsRag);
```

**RAG Pipeline:**
1. **Vector Search** — Query Qdrant `docs_chunks` and `resolved_cases` collections
2. **Reranking** — Use Cloudflare reranker (`@cf/baai/bge-reranker-base`) to score results
3. **Threshold Filtering** — Only use results with score >= 0.60
4. **LLM Generation** — Generate answer using Llama 3.3 70B with strict grounding rules

**Escalation:** If no answer can be grounded in documentation/context, respond with `ESCALATE` → human staff notification.

### Intent Classification

The bot classifies user intent before processing:

```javascript
// lib/intent.js
const INTENT_PROMPT = `Classify into INTENT|TYPE:
CASUAL|QUESTION|COMPLAINT|STATUS|UNCLEAR
question|followup|comment|acknowledgement`;
```

**Fast paths:**
- Messages <= 6 characters → `CASUAL|acknowledgement` (skip LLM)
- Vague "facing a problem" → `UNCLEAR|comment` (skip LLM)

### Multi-User Thread Support

The bot handles threads where multiple users have different issues:

```javascript
// lib/agent.js
// Detect if participant is reporting a NEW issue vs commenting on existing one
const isNewRequest = await classifyParticipantIntent(userMessage, issue);

if (isNewRequest) {
  // Create sub-issue for this participant
  const subIssue = await createLinkedIssue({ ... });
  // Run full RAG pipeline for sub-issue
}
```

**Flow:**
1. Primary issue created by thread owner
2. Secondary user asks different question → sub-issue created
3. Each user's messages routed to their respective issue
4. Thread brief shows all issues in thread

---

## Part 3: Configuration & Tuning

### Environment Variables (Railway Deployment)

This section lists **all environment variables** used by the bot. For Railway deployment, add these in your Railway project dashboard under **Variables**.

> **⚠️ Security Warning:** Never commit `.env` files or expose API tokens. Use Railway's secret variables feature.

---

#### Core Services (Required)

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `DISCORD_TOKEN` | Discord bot token from Discord Developer Portal | `<your_bot_token>` |
| `CLIENT_ID` | Discord application (bot) client ID | `<your_client_id>` |
| `GUILD_ID` | Discord server (guild) ID | `<your_guild_id>` |
| `SUPABASE_URL` | Supabase project URL | `https://<project>.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (full access) | `<your_service_key>` |
| `SUPABASE_KEY` | Supabase anon key (for client-side ops) | `<your_anon_key>` |
| `QDRANT_URL` | Qdrant vector database URL | `https://<instance>.cloud.qdrant.io` |
| `QDRANT_API_KEY` | Qdrant API key | `<your_api_key>` |
| `QDRANT_PIPELINE_COLLECTION` | Collection name for pipeline contexts | `pipeline_contexts` |
| `CF_ACCOUNT_ID` | Cloudflare account ID | `<your_account_id>` |
| `CF_API_TOKEN` | Cloudflare API token (Workers AI access) | `<your_api_token>` |
| `REDIS_URL` | Redis connection string (for queues + locks) | `redis://...` |

---

#### Pipeline Control Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTO_RUN_PIPELINE` | `false` | **Controls whether pipeline runs automatically on bot startup.** Set to `false` on Railway if using Supabase Edge Function cron instead. |
| `FORCE_FULL_PIPELINE` | `false` | When `true`, wipes Redis cursor and reprocesses **ALL** cleaned messages (ignores last batch timestamp). Use for re-indexing. |
| `AUTO_BACKFILL` | `true` | When `true`, backfills missed Discord messages on startup from last checkpoint. |

**Typical Railway Setup:**
```bash
# If running pipeline ON Railway:
AUTO_RUN_PIPELINE=true
FORCE_FULL_PIPELINE=false

# If using Supabase Edge Function for pipeline (recommended):
AUTO_RUN_PIPELINE=false
```

---

#### Discord Channel & Role Configuration

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `BAD_REPORT_CHANNEL_ID` | Forum channel ID for support issues | Discord → Right-click forum channel → Copy ID |
| `INGESTION_CHANNELS` | Comma-separated channel IDs for message ingestion | Discord → Copy multiple channel IDs |
| `ROLE_BILLING` | Discord role ID for billing department pings | Discord → Right-click role → Copy ID |
| `ROLE_TECHNICAL` | Discord role ID for technical department pings | Discord → Right-click role → Copy ID |
| `ROLE_PRODUCT` | Discord role ID for product department pings | Discord → Right-click role → Copy ID |
| `ROLE_UNCLASSIFIED` | Fallback role ID for unclassified issues | Discord → Right-click role → Copy ID |

**Example:**
```bash
BAD_REPORT_CHANNEL_ID="<your_forum_channel_id>"
INGESTION_CHANNELS="<channel_id_1>,<channel_id_2>"
ROLE_BILLING="<your_billing_role_id>"
ROLE_TECHNICAL="<your_technical_role_id>"
ROLE_PRODUCT="<your_product_role_id>"
ROLE_UNCLASSIFIED="<your_unclassified_role_id>"
```

---

#### Logging & Debug Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_PRETTY` | `false` | When `true`, outputs human-readable logs instead of JSON. Useful for debugging in Railway logs. |

---

### What Each Variable Controls

#### Bot Startup Behavior

```
┌─────────────────────────────────────────────────────────────┐
│                     Bot Starts                              │
│         ↓                                                   │
│  Read AUTO_RUN_PIPELINE                                     │
│         ↓                                                   │
│  ┌────┴────┐                                                │
│  │ true    │ false                                          │
│  │         │                                                │
│  │ Schedule│ Pipeline disabled                              │
│  │ pipeline│ (Supabase Edge Function handles it)            │
│  │ every   │                                                │
│  │ 12 hours│                                                │
│  └─────────┘                                                │
│         ↓                                                   │
│  Read AUTO_BACKFILL                                         │
│         ↓                                                   │
│  ┌────┴────┐                                                │
│  │ true    │ false                                          │
│  │         │                                                │
│  │ Backfill│ Skip backfill                                  │
│  │ missed  │ (only ingest new messages)                     │
│  │ messages│                                                │
│  └─────────┘                                                │
└─────────────────────────────────────────────────────────────┘
```

#### Pipeline Execution Flow

```bash
# When AUTO_RUN_PIPELINE=true:

1. Bot starts → waits 60 seconds
2. Checks FORCE_FULL_PIPELINE
   - If true: Wipes Redis cursor, fetches ALL messages
   - If false: Fetches messages since last batch
3. Runs pipeline (fetch → segment → classify → store → embed)
4. Schedules next run in 12 hours
```

#### Ingestion Channels

The `INGESTION_CHANNELS` variable controls which Discord channels are monitored for community message ingestion:

```javascript
// lib/ingestion/index.js
const channelIds = (process.env.INGESTION_CHANNELS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
```

- Messages from these channels are cleaned and stored in `community_messages_clean`
- The pipeline then processes these cleaned messages
- **Tip:** Only include general chat channels, not support threads

---

### Railway-Specific Configuration

#### Recommended Setup for Z.ai Discord Server

```bash
# Discord
DISCORD_TOKEN=<your_bot_token>
CLIENT_ID=<your_client_id>
GUILD_ID=<your_guild_id>

# Supabase
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_KEY=<your_service_key>
SUPABASE_KEY=<your_anon_key>

# Qdrant
QDRANT_URL=https://<your-instance>.cloud.qdrant.io
QDRANT_API_KEY=<your_api_key>
QDRANT_PIPELINE_COLLECTION=pipeline_contexts

# Cloudflare AI
CF_ACCOUNT_ID=<your_account_id>
CF_API_TOKEN=<your_api_token>

# Redis (Railway-provided)
REDIS_URL=<railway_redis_url>

# Channels & Roles
BAD_REPORT_CHANNEL_ID=<your_forum_channel_id>
INGESTION_CHANNELS=<general_chat_channel_id_1>,<general_chat_channel_id_2>
ROLE_BILLING=<your_billing_role_id>
ROLE_TECHNICAL=<your_technical_role_id>
ROLE_PRODUCT=<your_product_role_id>
ROLE_UNCLASSIFIED=<your_fallback_role_id>

# Pipeline Control
AUTO_RUN_PIPELINE=false          # Use Supabase Edge Function instead
FORCE_FULL_PIPELINE=false        # Only true when re-indexing needed
AUTO_BACKFILL=true               # Backfill on startup

# Logging
LOG_PRETTY=true                  # Readable logs in Railway dashboard
```

#### When to Change Variables

| Scenario | Variables to Change |
|----------|---------------------|
| **Initial deployment** | All required variables |
| **Re-index all messages** | Set `FORCE_FULL_PIPELINE=true`, restart, then set back to `false` |
| **Switch to Supabase cron** | Set `AUTO_RUN_PIPELINE=false` |
| **Add new ingestion channel** | Append channel ID to `INGESTION_CHANNELS` |
| **Debug issues** | Set `LOG_PRETTY=true` for readable logs |
| **Department restructuring** | Update `ROLE_*` variables |

### Tuning for Daily Message Volume

The system is designed to handle varying message volumes. Here's how to tune based on your daily message count:

#### Low Volume (< 100 messages/day)

```javascript
// pipeline/pipeline.config.js
BOUNDARY_DEPTH_THRESHOLD: 0.10,  // More sensitive — detect more boundaries
MIN_SEGMENT_SIZE: 2,             // Allow smaller segments
BATCH_WINDOW_HOURS: 24,          // Run once daily
```

#### Medium Volume (100-1000 messages/day)

```javascript
// Default configuration works well
BOUNDARY_DEPTH_THRESHOLD: 0.15,
MIN_SEGMENT_SIZE: 3,
BATCH_WINDOW_HOURS: 12,
```

#### High Volume (> 1000 messages/day)

```javascript
BOUNDARY_DEPTH_THRESHOLD: 0.20,  // Less sensitive — fewer boundaries
MAX_SEGMENT_SIZE: 60,            // Smaller max segments
BATCH_WINDOW_HOURS: 6,           // Run more frequently
EMBEDDING_CONCURRENCY: 15,       // Higher concurrency
```

#### Ingestion Rate Limiting

For high-volume servers, control batch writer behavior:

```javascript
// lib/ingestion/batchWriter.js
const THRESHOLD = 50;            // Flush after N messages
const INTERVAL_MS = 30000;       // Or every 30 seconds
```

Adjust based on message rate:
- **Low volume:** Threshold=20, Interval=60000
- **Medium volume:** Threshold=50, Interval=30000
- **High volume:** Threshold=100, Interval=15000

### Performance Optimization

#### Qdrant Search Optimization

```javascript
// lib/qdrant.js
const COLLECTIONS = {
  docs: 'docs_chunks',
  cases: 'resolved_cases',
  tribal: 'tribal_knowledge',
  community: 'community_knowledge'
};
```

**Tiered search strategy:**
1. Search `docs_chunks` with limit=10 (broad net)
2. Search `resolved_cases` with limit=5 + department filter
3. Rerank all candidates together
4. Take top 5 after reranking

#### Embedding Optimization

```javascript
// lib/cloudflare.js
async function embedBatch(texts) {
  // Batch size: 100 texts per request
  // Delay between batches: 300ms
  // Concurrency: 10 parallel requests
}
```

For faster processing:
- Increase `EMBEDDING_CONCURRENCY` to 15-20
- Reduce `EMBEDDING_BATCH_DELAY_MS` to 100-200

For rate limit avoidance:
- Decrease `EMBEDDING_CONCURRENCY` to 5
- Increase `EMBEDDING_BATCH_DELAY_MS` to 500-1000

#### LLM Classification Optimization

```javascript
// pipeline/pipeline.config.js
CLASSIFIER_BATCH_SIZE: 10,       // Segments per API call
CLASSIFIER_BATCH_DELAY_MS: 500,  // Delay between batches
```

For faster classification:
- Increase `CLASSIFIER_BATCH_SIZE` to 20
- Reduce `CLASSIFIER_BATCH_DELAY_MS` to 200

For better quality:
- Increase `CLASSIFIER_SAMPLE_SIZE` to 20-25 (more categories discovered)
- Increase `CLASSIFIER_PREVIEW_MESSAGES` to 30-40 (more context per segment)

---

## Deployment

### Railway Deployment (Step-by-Step)

#### 1. Connect Repository

1. Go to [railway.app](https://railway.app)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `Zhipu-Fushou` repository

#### 2. Configure Build Settings

In Railway project dashboard, set:

```bash
# Build Command
pip install hdbscan numpy scikit-learn && npm install

# Start Command
node index.js
```

**Why Python packages?** The pipeline uses HDBSCAN clustering via Python subprocess (`pipeline/scripts/cluster.py`).

#### 3. Add Environment Variables

In Railway → **Variables** tab, add all variables from the [Configuration section](#environment-variables-railway-deployment):

```
DISCORD_TOKEN=...
CLIENT_ID=<your_client_id>
GUILD_ID=<your_guild_id>
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
SUPABASE_KEY=...
QDRANT_URL=...
QDRANT_API_KEY=...
QDRANT_PIPELINE_COLLECTION=pipeline_contexts
CF_ACCOUNT_ID=...
CF_API_TOKEN=...
REDIS_URL=...  # Railway provides this automatically if you add Redis
BAD_REPORT_CHANNEL_ID=<your_forum_channel_id>
INGESTION_CHANNELS=<channel_id_1>,<channel_id_2>
ROLE_BILLING=<your_billing_role_id>
ROLE_TECHNICAL=<your_technical_role_id>
ROLE_PRODUCT=<your_product_role_id>
ROLE_UNCLASSIFIED=<your_fallback_role_id>
AUTO_RUN_PIPELINE=false
FORCE_FULL_PIPELINE=false
AUTO_BACKFILL=true
LOG_PRETTY=true
```

> **Tip:** Use Railway's **Secret** feature for sensitive values (tokens, keys).

#### 4. Add Redis (Required)

1. In Railway project → **New** → **Database** → **Redis**
2. Railway automatically sets `REDIS_URL` environment variable
3. Redis is used for:
   - Pipeline distributed lock (prevents concurrent runs)
   - Batch tracking (cursor for incremental processing)
   - BullMQ job queues (forwarding, notifications)

#### 5. Deploy

Railway automatically deploys when you push to main branch or manually click **Deploy**.

**View logs:** Railway → **Deployments** → Click deployment → **View Logs**

---

### Architecture Decision: Pipeline Location

You have **two options** for running the semantic pipeline:

#### Option A: Run Pipeline on Railway (Bot handles everything)

```bash
AUTO_RUN_PIPELINE=true
```

**Pros:**
- Single deployment (bot + pipeline together)
- Simpler setup (no Supabase Edge Functions)

**Cons:**
- Uses Railway compute resources
- 12-hour intervals only (not real-time)

#### Option B: Run Pipeline on Supabase Edge Functions (Recommended)

```bash
AUTO_RUN_PIPELINE=false
```

**Pros:**
- Offloads compute to Supabase
- Can use pg_cron for precise scheduling
- Bot focuses on real-time Discord interactions

**Cons:**
- Requires Supabase Edge Function setup
- More moving parts

**Current Z.ai Setup:** Option B (Supabase Edge Functions via pg_cron)

---

### Supabase Setup

#### 1. Run SQL Migrations

In Supabase Dashboard → **SQL Editor**, run:

```bash
# Core tables
sql/issues.sql
sql/community_messages_clean.sql
sql/pipeline_clusters.sql
sql/users.sql

# Helper functions
sql/generate_short_id.sql
sql/increment_open_issues.sql
sql/decrement_open_issues.sql
sql/increment_reminder_count.sql
```

#### 2. Set Up pg_cron (Optional - for Edge Functions)

If using Supabase Edge Functions for pipeline + cleaning:

```bash
# Enable pg_cron extension
sql/enable_pg_cron.sql

# Schedule cron jobs
sql/setup_cron_jobs.sql
```

This schedules:
- `cleaning-cron` — Every 5 minutes (cleans raw Discord messages)
- `pipeline-cron` — Every 12 hours (runs semantic analysis)

#### 3. Deploy Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref <your_supabase_project_ref>

# Deploy Edge Functions
supabase functions deploy cleaning-cron
supabase functions deploy pipeline-cron
```

---

### Qdrant Setup

#### 1. Create Qdrant Instance

1. Go to [cloud.qdrant.io](https://cloud.qdrant.io)
2. Create new cluster (free tier available)
3. Get URL and API key from dashboard

#### 2. Collections Auto-Created

The bot automatically creates these collections on startup:

```javascript
// lib/qdrant.js
COLLECTIONS = {
  docs: 'docs_chunks',           // Documentation embeddings
  cases: 'resolved_cases',       // Resolved support cases
  tribal: 'tribal_knowledge',    // Internal knowledge base
  community: 'community_knowledge' // Community discussions
}
```

**Vector specs:**
- Size: 1024 (BGE-large-en-v1.5 embeddings)
- Distance: Cosine

---

### Discord Bot Setup

#### 1. Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** → Name it
3. Go to **Bot** → **Reset Token** → Copy token (for `DISCORD_TOKEN`)
4. Copy **Application ID** (for `CLIENT_ID`)

#### 2. Bot Permissions

Required permissions:
- Read Messages/View Channels
- Send Messages
- Send Messages in Threads
- Manage Threads
- Embed Links
- Read Message History
- Use Slash Commands
- Message Content Intent (⚠️ enable in **Bot** → **Privileged Gateway Intents**)

#### 3. Invite Bot to Server

OAuth2 URL Generator → Select:
- Scopes: `bot`, `applications.commands`
- Bot Permissions: (as above)

Copy URL and open in browser to invite.

#### 4. Get Discord IDs

Enable Developer Mode in Discord:
- User Settings → Advanced → Developer Mode

Then right-click any channel/role/user → **Copy ID**

Use these for:
- `GUILD_ID` — Your server ID
- `BAD_REPORT_CHANNEL_ID` — Forum channel for issues
- `INGESTION_CHANNELS` — Channels to monitor
- `ROLE_*` — Department role IDs

#### 5. Deploy Slash Commands

```bash
# After setting up .env
node deploy-commands.js
```

This registers `/report`, `/status`, `/myissues`, etc.

---

### Verification Checklist

After deployment, verify:

- [ ] Bot appears online in Discord server
- [ ] `/ping` command responds
- [ ] Messages are being ingested (check `community_messages_clean` table)
- [ ] `/report` creates issues in forum channel
- [ ] Bot responds to questions in threads
- [ ] Pipeline runs (check `pipeline_clusters` table for new rows)
- [ ] Redis is connected (Railway → Redis → Metrics)

---

## Database Schema

### Core Tables

#### `issues`
```sql
short_id        TEXT PRIMARY KEY    -- e.g., "ISS-1007"
user_discord_id TEXT
guild_id        TEXT
channel_id      TEXT
department      TEXT                -- billing/technical/product/unclassified
title           TEXT
description     TEXT
steps_tried     TEXT
status          TEXT                -- open/acknowledged/in_progress/resolved/closed
thread_id       TEXT                -- Discord thread ID
summary         TEXT                -- Running 2-sentence summary
reminder_count  INTEGER
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
resolved_at     TIMESTAMPTZ
```

#### `issue_messages`
```sql
issue_id        BIGINT REFERENCES issues(id)
role            TEXT                -- user/assistant/system
content         TEXT
discord_msg_id  TEXT
created_at      TIMESTAMPTZ
```

#### `community_messages_clean`
```sql
message_id      TEXT PRIMARY KEY
channel_id      TEXT
user_id         TEXT
username        TEXT
content         TEXT
timestamp       TIMESTAMPTZ
created_at      TIMESTAMPTZ
```

#### `pipeline_clusters`
```sql
batch_id        TEXT
cluster_id      INTEGER
topic_label     TEXT
start_timestamp TIMESTAMPTZ
end_timestamp   TIMESTAMPTZ
message_count   INTEGER
unique_users    INTEGER
avg_boundary_score DOUBLE PRECISION
created_at      TIMESTAMPTZ
```

---

## Development

### Local Setup

```bash
# Clone repository
git clone https://github.com/your-org/Zhipu-Fushou.git
cd Zhipu-Fushou

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Run bot
npm start

# Run pipeline (separate process)
npm run pipeline

# Run tests
npm test
```

### Testing

```bash
# Run all tests
npm test

# Run pipeline tests only
node --test pipeline/tests/*.test.js

# Run specific test file
node --test pipeline/tests/boundaryDetection.test.js
```

### Project Structure

```
Zhipu-Fushou/
├── index.js                 # Main bot entry point
├── deploy-commands.js       # Deploy slash commands to Discord
├── package.json
├── pipeline/
│   ├── src/
│   │   ├── index.js         # Pipeline orchestrator
│   │   ├── fetchMessages.js
│   │   ├── boundaryDetection.js
│   │   ├── contextBuilder.js
│   │   ├── embedder.js
│   │   ├── qdrantClient.js
│   │   ├── classifier.js
│   │   ├── storeResults.js
│   │   ├── batchTracker.js
│   │   └── logger.js
│   ├── pipeline.config.js   # Configuration
│   └── README.md
├── lib/
│   ├── agent.js             # RAG agent (4-layer pipeline)
│   ├── cloudflare.js        # Cloudflare AI wrappers
│   ├── qdrant.js            # Qdrant client
│   ├── issues.js            # Issue CRUD operations
│   ├── intent.js            # Intent classification
│   ├── rewriter.js          # Query rewriting
│   ├── responder.js         # Response generation
│   ├── memory.js            # Context assembly
│   ├── ingestion/           # Message ingestion system
│   ├── cleaning/            # Noise filtering
│   └── workers.js           # BullMQ workers
├── commands/
│   ├── report.js
│   ├── status.js
│   ├── myissues.js
│   ├── acknowledge.js
│   ├── resolve.js
│   ├── close.js
│   ├── debug.js
│   └── ping.js
├── supabase/
│   └── functions/           # Supabase Edge Functions
│       ├── cleaning-cron/
│       └── pipeline-cron/
├── sql/                     # Database migrations
└── scripts/                 # Utility scripts
```

---

## Author

**Hasin Raiyan**  
Website: [hasin.vercel.app](https://hasin.vercel.app)

---

## Related Documentation

- [Pipeline README](./pipeline/README.md) — Detailed pipeline documentation
- [Backfill README](./scripts/BACKFILL_README.md) — Message backfill instructions
- [SQL Migrations](./sql/) — Database schema definitions
