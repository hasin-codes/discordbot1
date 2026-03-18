# Current Discord Bot Architecture
## As of March 2026

---

# Overview

The current bot is a **basic RAG-powered Discord support bot** with:
- Simple issue tracking in Supabase
- Vector search via Qdrant for documentation
- LLM responses via Cloudflare Workers AI
- Background job processing with BullMQ/Redis

---

# Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DISCORD BOT (index.js)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │  Commands   │  │   Events    │  │   Threads   │  │   Messages  │       │
│  │  Handler    │  │  Listener   │  │  Listener   │  │  Handler    │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              lib/rag.js                                     │
│                     (Main Message Processing)                               │
│                                                                             │
│   User Message                                                              │
│        │                                                                    │
│        ▼                                                                    │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐              │
│   │ Casual Match │────►│   Embedding  │────►│ Qdrant Search│              │
│   │ (regex)      │     │ (Cloudflare) │     │ (2 tiers)    │              │
│   └──────────────┘     └──────────────┘     └──────────────┘              │
│         │                                            │                      │
│         │ No match                                   ▼                      │
│         │                                    ┌──────────────┐              │
│         │                                    │Score Check   │              │
│         │                                    │(>=0.40?)     │              │
│         │                                    └──────────────┘              │
│         │                                     │            │               │
│         │                              >=0.40 │            │ <0.40         │
│         │                                     ▼            ▼               │
│         │                              ┌──────────┐  ┌──────────┐         │
│         │                              │LLM Chat  │  │Escalate  │         │
│         │                              └──────────┘  └──────────┘         │
│         │                                     │            │               │
│         └─────────────────────────────────────┴────────────┘               │
│                                   │                                         │
│                                   ▼                                         │
│                            Send Response                                    │
│                                   │                                         │
│                                   ▼                                         │
│                         Save to DB (audit)                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        │                             │                             │
        ▼                             ▼                             ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│    Supabase   │           │    Qdrant     │           │   Cloudflare  │
│  (Database)   │           │  (Vectors)    │           │  (LLM/Embed)  │
├───────────────┤           ├───────────────┤           ├───────────────┤
│ • issues      │           │ • docs_chunks │           │ • qwen3-30b   │
│ • issue_msgs  │           │ • resolved_   │           │   (chat)      │
│ • status_log  │           │   cases       │           │ • qwen3-      │
│ • bot_config  │           │ • tribal      │           │   embedding   │
│               │           │ • community   │           │   (embed)     │
└───────────────┘           └───────────────┘           └───────────────┘
```

---

# 1. DATA FLOW

## 1.1 Message Processing Flow

```
User sends message in thread
        │
        ▼
index.js: messageCreate event
        │
        ▼
Look up issue by thread_id
        │
        ▼
Call rag.answerInThread()
        │
        ├──► Casual pattern match? ──► Send preset reply ──► Save ──► Done
        │
        │ No
        ▼
Embed user message (Cloudflare)
        │
        ▼
Search Qdrant (Tier 1: docs, Tier 2: resolved_cases)
        │
        ▼
Check best score
        │
        ├──► score < 0.40? ──► Escalate (ping staff) ──► Save ──► Done
        │
        │ No
        ▼
Build context from top results
        │
        ▼
Call LLM with context + query
        │
        ├──► LLM returns "ESCALATE"? ──► Escalate ──► Save ──► Done
        │
        │ No
        ▼
Send response (with disclaimer if score < 0.80)
        │
        ▼
Save to issue_messages
        │
        ▼
Done
```

## 1.2 Command Flow

```
User runs /report
        │
        ▼
Show modal (title, description, steps_tried)
        │
        ▼
User submits
        │
        ▼
Create issue in Supabase
        │
        ▼
Create thread in support channel
        │
        ▼
Save thread_id to issue
        │
        ▼
Ping staff (background job)
        │
        ▼
User can now chat in thread
```

---

# 2. MEMORY SYSTEM (CURRENT)

## 2.1 What Is Remembered

| Memory Type | Storage | Scope | Retrieval |
|-------------|---------|-------|-----------|
| **Issue Data** | Supabase `issues` table | Issue lifetime | By thread_id lookup |
| **Messages** | Supabase `issue_messages` | Permanent | ❌ NOT retrieved for LLM |
| **Documentation** | Qdrant `docs_chunks` | Permanent | Vector similarity search |
| **Resolved Cases** | Qdrant `resolved_cases` | Permanent | Vector similarity search |
| **Config** | Supabase `bot_config` + cache | TTL 2 min | Cached lookup |

## 2.2 What Is NOT Remembered

| Missing | Impact |
|---------|--------|
| **Conversation history in LLM context** | Bot can't follow multi-turn conversations |
| **User profiles** | No cross-thread or cross-session memory |
| **Thread summaries** | Long conversations lose early context |
| **Extracted facts** | No structured knowledge extraction |
| **Resolution tracking** | No learning from resolved issues |

## 2.3 Message Storage (Audit Only)

```javascript
// Messages ARE saved to database
await saveMessage({
  issueId: issue.id,
  role: 'user' | 'assistant' | 'system',
  content: message,
  discordMsgId: msg.id
});

// But NEVER retrieved for context
// Current RAG only uses current message + vector search results
```

---

# 3. RAG SYSTEM (CURRENT)

## 3.1 Implementation

```javascript
// lib/rag.js - Simplified Flow

const THRESHOLD_ANSWER   = 0.80;  // High confidence
const THRESHOLD_CAUTIOUS = 0.40;  // Minimum to proceed

async function answerInThread(client, thread, issue, userMessage) {
  
  // 1. Check casual patterns (greetings, thanks, etc.)
  for (const { pattern, reply } of CASUAL_PATTERNS) {
    if (pattern.test(userMessage.trim())) {
      await thread.send({ content: reply });
      return true;
    }
  }

  // 2. Embed the user message
  const embedding = await embed(userMessage);

  // 3. Search Qdrant collections
  const tier1Results = await search('docs_chunks', embedding, 4);
  const tier2Results = await search('resolved_cases', embedding, 3, {
    filter: { department: issue.department }
  });

  // 4. Get best score
  const allResults = [...tier1Results, ...tier2Results];
  const bestScore = Math.max(...allResults.map(r => r.score));

  // 5. Score too low? Escalate
  if (bestScore < THRESHOLD_CAUTIOUS) {
    await escalate(client, thread, issue, userMessage);
    return true;
  }

  // 6. Build context from results
  const context = allResults
    .filter(r => r.score >= THRESHOLD_CAUTIOUS)
    .slice(0, 5)
    .map(r => `[Source: ${r.payload.source}]\n${r.payload.content}`)
    .join('\n\n---\n\n');

  // 7. Call LLM
  const answer = await chat(SYSTEM_PROMPT, [
    { role: 'user', content: userMessage }  // ONLY current message!
  ]);

  // 8. LLM says escalate?
  if (answer.startsWith('ESCALATE')) {
    await escalate(client, thread, issue, userMessage);
    return true;
  }

  // 9. Send response
  await thread.send({ content: answer });

  // 10. Save for audit (not used for context)
  await saveMessage({ issueId, role: 'assistant', content: answer });
}
```

## 3.2 Limitations

| Limitation | Description |
|------------|-------------|
| **No conversation history** | LLM only sees current message |
| **Raw query embedding** | No query reformulation |
| **No user context** | Doesn't know user's history or preferences |
| **Fixed thresholds** | 0.40/0.80 hardcoded, not adaptive |
| **No reranking** | Results used in score order only |
| **Empty resolved_cases** | Collection exists but never populated |

---

# 4. ESCALATION SYSTEM (CURRENT)

## 4.1 Escalation Triggers

| Trigger | Implementation |
|---------|----------------|
| **Low RAG score** | `bestScore < 0.40` |
| **LLM decision** | LLM returns "ESCALATE" |
| **Already escalated** | Checks `issue_messages` for escalation marker |

## 4.2 Escalation Flow

```javascript
async function escalate(client, thread, issue, userMessage) {
  
  // Check if already escalated
  const alreadyEscalated = await hasBeenEscalated(issue.id);

  if (!alreadyEscalated) {
    // First escalation
    await thread.send({
      content: `I wasn't able to find a clear answer...
                A team member has been flagged and will follow up.`
    });
    
    // Ping staff role
    await pingRoleInThread(client, thread, issue, 'escalation');
  } else {
    // Already escalated, just acknowledge
    await thread.send({
      content: `I still don't have an answer. 
                A team member has already been notified.`
    });
  }

  // Save escalation marker
  await saveMessage({
    issueId: issue.id,
    role: 'system',
    content: `RAG escalation — no answer found for: "${userMessage.slice(0, 200)}"`
  });
}
```

## 4.3 Limitations

| Missing | Impact |
|---------|--------|
| **No sentiment detection** | Frustrated users not detected |
| **No dead-end detection** | Looping conversations not caught |
| **No complexity assessment** | Complex issues not auto-routed |
| **No VIP detection** | Premium users not prioritized |
| **No handoff context** | Staff doesn't get conversation summary |
| **No urgency detection** | Time-sensitive issues not fast-tracked |

---

# 5. DATABASE SCHEMA (CURRENT)

## 5.1 Tables

### `issues`
```sql
CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id TEXT UNIQUE,              -- Human-readable ID (e.g., "ISS-001")
  user_discord_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  channel_id TEXT,
  thread_id TEXT,                    -- Discord thread ID
  department TEXT,                   -- billing, technical, product, etc.
  title TEXT NOT NULL,
  description TEXT,
  steps_tried TEXT,
  status TEXT DEFAULT 'open',        -- open, acknowledged, resolved, closed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `issue_messages`
```sql
CREATE TABLE issue_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES issues(id),
  role TEXT NOT NULL,                -- user, assistant, system
  content TEXT NOT NULL,
  discord_msg_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `status_log`
```sql
CREATE TABLE status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES issues(id),
  old_status TEXT,
  new_status TEXT,
  changed_by TEXT,                   -- Discord ID of who changed it
  reason TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `bot_config`
```sql
CREATE TABLE bot_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 5.2 Missing Tables (for V2)

- `user_profiles`
- `thread_summaries`
- `extracted_facts`
- `escalation_events`

---

# 6. QDRANT COLLECTIONS (CURRENT)

## 6.1 Collections

| Collection | Purpose | Status |
|------------|---------|--------|
| `docs_chunks` | Documentation chunks | ✅ Active (6 chunks from general-faq.md) |
| `resolved_cases` | Past resolved issues | ❌ Empty (never populated) |
| `tribal_knowledge` | Team knowledge | ❌ Empty |
| `community_knowledge` | Community FAQ | ❌ Empty |

## 6.2 Vector Configuration

```javascript
// lib/qdrant.js
const VECTOR_SIZE = 1024;  // qwen3-embedding-0.6b
const DISTANCE = 'Cosine';

// Each point:
{
  id: UUID,
  vector: [1024 floats],
  payload: {
    content: "chunk text",
    source: "filename.md",
    chunk_index: 0,
    ingested_at: "timestamp"
  }
}
```

---

# 7. COMMANDS (CURRENT)

| Command | Who | Description |
|---------|-----|-------------|
| `/report` | Anyone | Open modal to create new issue |
| `/status [id]` | Anyone | Check issue status |
| `/myissues` | Anyone | List your open issues |
| `/acknowledge [id]` | Staff | Mark issue as being looked into |
| `/resolve [id]` | Staff | Mark issue as resolved |
| `/close [id]` | Staff | Close issue |
| `/ping` | Anyone | Health check |
| `/debug` | Staff | Debug information |

---

# 8. FILE STRUCTURE (CURRENT)

```
Discordbot/
├── index.js              # Entry point, event handlers, command registration
├── deploy-commands.js    # Register slash commands with Discord
├── package.json          # Dependencies
├── .env                  # Environment variables
│
├── commands/             # Slash command handlers
│   ├── report.js         # /report - create issue
│   ├── status.js         # /status - check issue
│   ├── myissues.js       # /myissues - list user issues
│   ├── acknowledge.js    # /acknowledge - staff acknowledge
│   ├── resolve.js        # /resolve - staff resolve
│   ├── close.js          # /close - staff close
│   ├── ping.js           # /ping - health check
│   └── debug.js          # /debug - debug info
│
├── lib/                  # Core business logic
│   ├── rag.js            # RAG pipeline (main message processor)
│   ├── issues.js         # Issue CRUD operations
│   ├── workers.js        # BullMQ background jobs
│   ├── config.js         # Bot configuration (cached)
│   ├── supabase.js       # Supabase client
│   ├── qdrant.js         # Qdrant vector store client
│   ├── cloudflare.js     # Cloudflare AI (LLM + embeddings)
│   └── forward.js        # Discord forwarding utilities
│
├── scripts/              # Utility scripts
│   └── ingest.js         # Ingest docs to Qdrant
│
└── docs/                 # Documentation files
    └── general-faq.md    # FAQ documentation
```

---

# 9. BACKGROUND JOBS (CURRENT)

## 9.1 BullMQ Workers

```javascript
// lib/workers.js

// Job: Forward new issue to department channel
worker.on('forward', async job => {
  const { issueId, channelId } = job.data;
  // Create embed and send to department channel
});

// Job: Send notification to user
worker.on('notify', async job => {
  const { userId, message } = job.data;
  // DM user or reply in thread
});
```

## 9.2 Job Triggers

| Job | When Triggered |
|-----|----------------|
| `forward` | New issue created |
| `notify` | Status changed |
| `reminder` | Stale issue check (scheduled) |

---

# 10. COMPARISON: CURRENT vs V2

| Feature | Current | V2 Proposed |
|---------|---------|-------------|
| **Conversation Memory** | ❌ None (only current message) | ✅ 3-tier hierarchical |
| **Per-User Memory** | ❌ None | ✅ User profiles |
| **Per-Thread Memory** | ❌ Issue only | ✅ Summaries + facts |
| **RAG Query** | Raw message | Reformulated + optimized |
| **Multi-collection Search** | ✅ 2 collections | ✅ 4+ with weights |
| **Escalation Triggers** | Score only | Sentiment + complexity + dead-end + VIP |
| **Handoff Context** | ❌ None | ✅ Full summary + history |
| **Learning** | ❌ None | ✅ Auto-ingest resolved cases |
| **Intent Detection** | ❌ Regex only | ✅ LLM classification |
| **Entity Extraction** | ❌ None | ✅ Structured facts |
| **Memory Decay** | ❌ None | ✅ Confidence-based decay |
| **VIP Detection** | ❌ None | ✅ Profile-based |

---

# 11. KEY METRICS (CURRENT)

| Metric | Current State | Notes |
|--------|---------------|-------|
| **First-Contact Resolution** | Unknown | No tracking |
| **Escalation Rate** | Unknown | No metrics logged |
| **Response Time** | N/A | Instant (when bot responds) |
| **User Satisfaction** | Unknown | No surveys |
| **RAG Accuracy** | ~70% (estimated) | Based on 0.40 threshold |

---

# APPENDIX: Environment Variables

```env
# Discord
DISCORD_TOKEN=...
CLIENT_ID=...
GUILD_ID=...

# Supabase
SUPABASE_URL=...
SUPABASE_KEY=...

# Cloudflare AI
CF_ACCOUNT_ID=...
CF_API_TOKEN=...

# Qdrant
QDRANT_URL=...
QDRANT_API_KEY=...

# Channel IDs
BAD_REPORT_CHANNEL_ID=...

# Role IDs
ROLE_BILLING=...
ROLE_TECHNICAL=...
ROLE_PRODUCT=...
ROLE_UNCLASSIFIED=...
```
