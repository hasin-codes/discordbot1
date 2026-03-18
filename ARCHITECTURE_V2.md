# Agentic Support Bot Architecture V2
## A World-Class Memory & Decision System

---

# Overview

This architecture implements a **production-grade AI support system** with:
- **3-Tier Hierarchical Memory** (working → short-term → long-term)
- **Intelligent Escalation Engine** (sentiment, complexity, dead-end detection)
- **Smart RAG Routing** (when to search vs when to reason)
- **Per-User + Per-Thread Memory** (persistent profiles + conversation context)
- **Learning Loop** (resolved cases become future knowledge)

---

# Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DISCORD BOT ENTRY POINT                           │
│                               (index.js)                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ORCHESTRATOR (lib/orchestrator.js)                 │
│  Coordinates all subsystems, manages flow, makes high-level decisions       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        │                             │                             │
        ▼                             ▼                             ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│   UNDERSTAND  │           │    MEMORY     │           │  ESCALATION   │
│  (intent.js)  │           │ (memory.js)   │           │(escalation.js)│
├───────────────┤           ├───────────────┤           ├───────────────┤
│ • Intent      │           │ • Working     │           │ • Sentiment   │
│ • Entities    │◄─────────►│ • Short-term  │◄─────────►│ • Dead-ends   │
│ • Sentiment   │           │ • Long-term   │           │ • Complexity  │
│ • Urgency     │           │ • User Profile│           │ • VIP detect  │
└───────────────┘           └───────────────┘           └───────────────┘
        │                             │                             │
        │                             │                             │
        ▼                             ▼                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          RETRIEVAL (lib/retrieval.js)                       │
│  Decides: RAG search? Knowledge graph? User profile? Conversation history?  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          RESPONSE (lib/respond.js)                          │
│  Builds rich context, generates response, evaluates confidence              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LEARNING (lib/learning.js)                        │
│  Extracts facts, updates memory, flags resolved cases for ingestion         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 1. MEMORY SYSTEM

## 1.1 Three-Tier Hierarchical Memory

Based on production patterns from LangChain, Mem0, and Letta:

```
┌─────────────────────────────────────────────────────────────────┐
│                  TIER 1: WORKING MEMORY                         │
│  ─────────────────────────────────────────────────────────────  │
│  • Current conversation (last 10-15 messages)                   │
│  • Always in context window                                     │
│  • Instant access, small capacity (~8K tokens)                  │
│  • Storage: In-memory + issue_messages table                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Summarize when overflow
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  TIER 2: SHORT-TERM MEMORY                      │
│  ─────────────────────────────────────────────────────────────  │
│  • Thread summaries (what was discussed)                        │
│  • Extracted facts from current session                         │
│  • Resolution progress tracking                                 │
│  • Fast retrieval, medium capacity (~30K tokens equivalent)     │
│  • Storage: Supabase (thread_summaries, extracted_facts)       │
│  • TTL: 7 days, then archived                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Promote important facts
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  TIER 3: LONG-TERM MEMORY                       │
│  ─────────────────────────────────────────────────────────────  │
│  • User profile (preferences, history, common issues)           │
│  • Resolved cases (for RAG)                                     │
│  • Documentation knowledge base                                 │
│  • Semantic search, massive capacity                            │
│  • Storage: Qdrant (vectors) + Supabase (user_profiles)        │
│  • Persistent, with decay mechanism                             │
└─────────────────────────────────────────────────────────────────┘
```

## 1.2 Per-Thread Memory

Each Discord thread has its own memory context:

```javascript
// Thread Memory Structure
{
  thread_id: "123456789",
  issue_id: "uuid",
  
  // Working Memory
  recent_messages: [
    { role: "user", content: "...", timestamp: "...", intent: "question" },
    { role: "assistant", content: "...", timestamp: "...", sources: [...] }
  ],
  
  // Short-Term Memory
  thread_summary: "User had payment issue with Visa card, resolved by updating billing info",
  extracted_facts: [
    { subject: "user", predicate: "payment_method", object: "Visa ****1234", confidence: 0.95 },
    { subject: "issue", predicate: "type", object: "billing", confidence: 0.90 }
  ],
  resolution_progress: "identified → troubleshooting → resolved",
  
  // Metadata
  message_count: 12,
  first_message_at: "2024-01-15T10:30:00Z",
  last_message_at: "2024-01-15T10:45:00Z"
}
```

## 1.3 Per-User Memory

Persistent profile across all interactions:

```javascript
// User Profile Structure
{
  discord_id: "987654321",
  
  // Identity
  total_issues: 15,
  first_seen: "2023-06-01T00:00:00Z",
  last_interaction: "2024-01-15T10:45:00Z",
  
  // Preferences (extracted from conversations)
  preferences: [
    { key: "language", value: "English", confidence: 0.95, updated_at: "..." },
    { key: "timezone", value: "UTC-5", confidence: 0.80, updated_at: "..." },
    { key: "preferred_contact", value: "Discord", confidence: 0.90, updated_at: "..." }
  ],
  
  // Common Issues (for proactive support)
  common_departments: { billing: 8, technical: 5, product: 2 },
  common_issues: [
    { pattern: "password reset", count: 3 },
    { pattern: "billing inquiry", count: 5 }
  ],
  
  // VIP Status
  is_vip: false,
  vip_level: null,
  
  // Notes (from staff)
  staff_notes: "Patient user, prefers detailed explanations",
  
  // Cross-thread facts (things true across all interactions)
  persistent_facts: [
    { fact: "Uses mobile app on Android", confidence: 0.85 },
    { fact: "Premium subscriber since 2023", confidence: 0.95 }
  ]
}
```

## 1.4 Memory Decay & Forgetting

```javascript
// Memories decay if not accessed
async function applyMemoryDecay() {
  const facts = await getOldFacts();
  
  for (const fact of facts) {
    const daysSinceAccess = daysSince(fact.last_accessed);
    const decayFactor = Math.exp(-0.05 * daysSinceAccess);
    fact.confidence *= decayFactor;
    
    if (fact.confidence < 0.2) {
      await archiveFact(fact);  // Don't delete, archive
    }
  }
}

// Run daily
scheduleJob('0 3 * * *', applyMemoryDecay);
```

---

# 2. ESCALATION ENGINE

## 2.1 When to Escalate (Triggers)

Based on industry best practices:

| Trigger Category | Signals | Action |
|------------------|---------|--------|
| **Sentiment** | Frustration keywords, anger, panic, urgency words | Immediate escalation |
| **Dead-End** | Same question 3+ times, "I already tried that", circular conversation | Escalate with context |
| **Complexity** | Technical terms, multi-step requests, API errors | Route to specialist |
| **VIP Status** | Premium user, enterprise account | Priority routing |
| **Confidence** | RAG score < 0.40, LLM returns "ESCALATE" | Escalate with summary |
| **Policy Exception** | Refund request, account deletion, legal mentions | Human required |
| **Time-Sensitive** | "urgent", "ASAP", "deadline today" | Fast-track |

## 2.2 Escalation Decision Matrix

```javascript
async function shouldEscalate(context) {
  const signals = {
    sentiment: await analyzeSentiment(context.userMessage),
    deadEnd: detectDeadEnd(context.conversationHistory),
    complexity: assessComplexity(context.userMessage, context.intent),
    confidence: context.ragScore || 1.0,
    vipStatus: context.userProfile.is_vip,
    policyKeywords: detectPolicyKeywords(context.userMessage),
    urgencyKeywords: detectUrgency(context.userMessage)
  };
  
  const escalationScore = calculateEscalationScore(signals);
  
  return {
    shouldEscalate: escalationScore > 0.6,
    score: escalationScore,
    reason: getPrimaryReason(signals),
    priority: determinePriority(signals),
    handoffContext: buildHandoffContext(context)
  };
}

function calculateEscalationScore(signals) {
  let score = 0;
  
  // Sentiment is critical
  if (signals.sentiment.negative > 0.7) score += 0.4;
  if (signals.sentiment.anger > 0.5) score += 0.3;
  
  // Dead-end detection
  if (signals.deadEnd.isStuck) score += 0.3;
  if (signals.deadEnd.loopCount > 2) score += 0.2;
  
  // Confidence threshold
  if (signals.confidence < 0.40) score += 0.3;
  
  // Complexity
  if (signals.complexity > 0.7) score += 0.2;
  
  // Policy keywords are automatic
  if (signals.policyKeywords.length > 0) score = 1.0;
  
  // VIP gets priority, not automatic escalation
  if (signals.vipStatus) score += 0.1;
  
  return Math.min(score, 1.0);
}
```

## 2.3 Smart Handoff

When escalating, pass full context to human:

```javascript
async function buildHandoffContext(context) {
  return {
    // Quick summary
    summary: await generateThreadSummary(context.threadId),
    
    // Issue details
    issue: {
      id: context.issue.short_id,
      department: context.issue.department,
      status: context.issue.status,
      created_at: context.issue.created_at
    },
    
    // User context
    user: {
      discord_id: context.userProfile.discord_id,
      is_vip: context.userProfile.is_vip,
      total_issues: context.userProfile.total_issues,
      staff_notes: context.userProfile.staff_notes
    },
    
    // What was tried
    troubleshooting_attempts: extractTroubleshootingSteps(context.conversationHistory),
    
    // Why escalated
    escalation_reason: context.escalationReason,
    
    // Suggested next steps (from AI)
    suggested_actions: await suggestNextSteps(context),
    
    // Full conversation
    conversation: formatConversationForHandoff(context.conversationHistory)
  };
}
```

---

# 3. RAG ROUTING SYSTEM

## 3.1 When to Use RAG vs Other Approaches

```
┌─────────────────────────────────────────────────────────────────┐
│                    QUERY CLASSIFICATION                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Is it a greeting/casual message?                              │
│  ────────────────────────────────                              │
│  YES → Direct response (no RAG needed)                         │
│  NO  ↓                                                         │
│                                                                 │
│  Is it a follow-up to previous conversation?                   │
│  ────────────────────────────────────                          │
│  YES → Use conversation history + context                      │
│  NO  ↓                                                         │
│                                                                 │
│  Is it a factual question about product/service?               │
│  ────────────────────────────────────────                      │
│  YES → RAG search (docs + resolved_cases)                      │
│  NO  ↓                                                         │
│                                                                 │
│  Is it a personal account question?                            │
│  ────────────────────────────────                              │
│  YES → Check user profile + escalate if needed                 │
│  NO  ↓                                                         │
│                                                                 │
│  Is it a complex multi-step request?                           │
│  ────────────────────────────────                              │
│  YES → Break down + use RAG per step + may escalate            │
│  NO  ↓                                                         │
│                                                                 │
│  Default → Attempt RAG, fallback to escalate                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 3.2 Multi-Collection RAG with Weights

```javascript
async function retrieve(query, context) {
  const embedding = await embed(query);
  
  // Search multiple collections in parallel
  const [docs, cases, userFacts, tribal] = await Promise.all([
    search('docs_chunks', embedding, { limit: 5, weight: 0.5 }),
    search('resolved_cases', embedding, { limit: 3, weight: 0.3, 
      filter: { department: context.issue.department } }),
    search('user_facts', embedding, { limit: 3, weight: 0.15,
      filter: { user_id: context.userProfile.discord_id } }),
    search('tribal_knowledge', embedding, { limit: 2, weight: 0.05 })
  ]);
  
  // Merge and rerank
  const merged = mergeResults([docs, cases, userFacts, tribal]);
  const reranked = await rerankByRelevance(merged, query, context);
  
  return reranked.slice(0, 10);
}
```

## 3.3 Query Reformulation

Before embedding, optimize the query:

```javascript
async function reformulateQuery(userMessage, conversationHistory, intent) {
  const prompt = `Given this user message and conversation context, create an optimized search query.

User message: "${userMessage}"

Recent context:
${formatHistory(conversationHistory.slice(-3))}

Intent: ${intent.type}

Rules:
1. Remove filler words ("umm", "like", "you know")
2. Extract core question/topic
3. Add synonyms if helpful
4. Include relevant context from history

Return ONLY the search query, nothing else.`;

  return await chat(prompt, { maxTokens: 100 });
}

// Example:
// Input: "umm how to change the password I forgot it"
// Output: "password reset forgot password recovery process"
```

---

# 4. UNDERSTANDING (INTENT PARSING)

## 4.1 Intent Classification

```javascript
const INTENTS = {
  QUESTION: 'question',           // Seeking information
  COMPLAINT: 'complaint',         // Expressing dissatisfaction
  FOLLOW_UP: 'follow_up',         // Continuing previous topic
  CLARIFICATION: 'clarification', // Asking for more details
  CONFIRMATION: 'confirmation',   // Acknowledging/confirming
  GREETING: 'greeting',           // Social opening
  THANKS: 'thanks',               // Gratitude
  ESCALATION_REQUEST: 'escalation_request', // Explicit human request
  STATUS_CHECK: 'status_check',   // Checking issue status
  NEW_ISSUE: 'new_issue'          // Reporting new problem
};

async function classifyIntent(message, context) {
  // Use LLM for nuanced classification
  const prompt = `Classify the user's intent.

Message: "${message}"

Context: ${context.threadSummary || 'New conversation'}

Return JSON:
{
  "intent": "question|complaint|follow_up|...",
  "confidence": 0.0-1.0,
  "topic": "brief topic description",
  "entities": ["mentioned", "entities"]
}`;

  return await chat(prompt, { responseFormat: 'json' });
}
```

## 4.2 Entity Extraction

```javascript
async function extractEntities(message, context) {
  const prompt = `Extract structured entities from this message.

Message: "${message}"

Return JSON array of facts:
[
  {
    "subject": "entity name",
    "predicate": "relationship/attribute",
    "object": "value",
    "confidence": 0.0-1.0,
    "category": "user_info|issue_detail|preference|temporal"
  }
]

Examples:
- "I can't login to my Android app" → [{subject: "user", predicate: "platform", object: "Android app", confidence: 0.9, category: "user_info"}]
- "My Visa card was declined" → [{subject: "payment_method", predicate: "type", object: "Visa", confidence: 0.95, category: "issue_detail"}]
`;

  return await chat(prompt, { responseFormat: 'json' });
}
```

---

# 5. RESPONSE GENERATION

## 5.1 Context Building

```javascript
async function buildContext(context) {
  const parts = [];
  
  // 1. User Profile (if relevant)
  if (context.userProfile) {
    parts.push({
      type: 'user_profile',
      content: formatUserProfile(context.userProfile),
      priority: 'high'
    });
  }
  
  // 2. Conversation History (working memory)
  const recentHistory = await getRecentMessages(context.issueId, 10);
  parts.push({
    type: 'conversation',
    content: formatConversation(recentHistory),
    priority: 'critical'
  });
  
  // 3. Thread Summary (if long conversation)
  if (recentHistory.length > 10) {
    const summary = await getThreadSummary(context.threadId);
    parts.push({
      type: 'summary',
      content: summary,
      priority: 'medium'
    });
  }
  
  // 4. Retrieved Documents (RAG results)
  if (context.retrievedDocs.length > 0) {
    parts.push({
      type: 'documentation',
      content: formatRetrievedDocs(context.retrievedDocs),
      priority: 'high'
    });
  }
  
  // 5. Issue Context
  parts.push({
    type: 'issue',
    content: formatIssueContext(context.issue),
    priority: 'medium'
  });
  
  return assembleContext(parts, TOKEN_BUDGET);
}
```

## 5.2 Response with Confidence

```javascript
async function generateResponse(context) {
  const fullContext = await buildContext(context);
  
  const prompt = `You are a friendly support assistant.

## User Profile
${fullContext.userProfile || 'New user'}

## Conversation So Far
${fullContext.conversation}

${fullContext.summary ? `## Earlier Summary\n${fullContext.summary}\n` : ''}

## Relevant Documentation
${fullContext.documentation || 'No specific documentation found.'}

## Current Issue
${fullContext.issue}

## Rules
1. Answer based on documentation and conversation context
2. If unsure, respond with: ESCALATE
3. Be concise and friendly
4. Reference previous messages when relevant
5. If the user seems frustrated, acknowledge it

Respond to: ${context.userMessage}`;

  const response = await chat(prompt);
  
  // Self-evaluate confidence
  const confidence = await evaluateResponse(response, context);
  
  return {
    content: response,
    confidence,
    sources: context.retrievedDocs.map(d => d.source),
    shouldEscalate: response.includes('ESCALATE') || confidence < 0.5
  };
}
```

---

# 6. LEARNING LOOP

## 6.1 Fact Extraction & Storage

```javascript
async function processAndLearn(context) {
  // 1. Extract facts from conversation
  const facts = await extractEntities(context.userMessage, context);
  
  // 2. Store in short-term memory
  for (const fact of facts) {
    await storeFact({
      ...fact,
      issue_id: context.issueId,
      thread_id: context.threadId,
      user_id: context.userId,
      created_at: new Date()
    });
  }
  
  // 3. Check for contradictions with existing facts
  for (const fact of facts) {
    const existing = await findContradictingFacts(fact);
    if (existing) {
      await markSuperseded(existing.id, fact);
    }
  }
  
  // 4. Promote high-confidence facts to user profile
  const highConfidenceFacts = facts.filter(f => f.confidence > 0.85);
  for (const fact of highConfidenceFacts) {
    await promoteToUserProfile(context.userId, fact);
  }
}
```

## 6.2 Resolved Case Ingestion

```javascript
// When an issue is resolved, automatically learn from it
async function onIssueResolved(issueId) {
  const issue = await getIssue(issueId);
  const messages = await getIssueMessages(issueId);
  
  // 1. Generate resolution summary
  const summary = await generateResolutionSummary(issue, messages);
  
  // 2. Create case document
  const caseDoc = {
    id: uuidv4(),
    content: `
## Issue
${issue.description}

## Resolution
${summary.resolution}

## Steps Taken
${summary.steps}

## Outcome
${summary.outcome}
    `.trim(),
    metadata: {
      issue_id: issueId,
      department: issue.department,
      resolution_time: calculateResolutionTime(issue),
      satisfaction: await getSatisfactionScore(issueId)
    }
  };
  
  // 3. Embed and store in resolved_cases
  const embedding = await embed(caseDoc.content);
  await upsert('resolved_cases', [{
    id: caseDoc.id,
    vector: embedding,
    payload: caseDoc
  }]);
  
  console.log(`[learning] Ingested resolved case ${issue.short_id}`);
}
```

---

# 7. DATABASE SCHEMA

## 7.1 New Tables

```sql
-- Thread summaries (short-term memory)
CREATE TABLE thread_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id TEXT UNIQUE NOT NULL,
  issue_id UUID REFERENCES issues(id),
  summary TEXT,
  key_topics TEXT[],
  resolution_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extracted facts (short-term → long-term)
CREATE TABLE extracted_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  thread_id TEXT,
  issue_id UUID REFERENCES issues(id),
  subject TEXT NOT NULL,
  predicate TEXT NOT NULL,
  object TEXT NOT NULL,
  confidence FLOAT DEFAULT 0.5,
  category TEXT,
  superseded_by UUID REFERENCES extracted_facts(id),
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles (long-term memory)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id TEXT UNIQUE NOT NULL,
  preferences JSONB DEFAULT '{}',
  persistent_facts JSONB DEFAULT '[]',
  common_departments JSONB DEFAULT '{}',
  common_issues JSONB DEFAULT '[]',
  is_vip BOOLEAN DEFAULT FALSE,
  vip_level TEXT,
  staff_notes TEXT,
  total_issues INT DEFAULT 0,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_interaction TIMESTAMPTZ DEFAULT NOW()
);

-- Escalation history
CREATE TABLE escalation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES issues(id),
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  trigger_reason TEXT,
  trigger_score FLOAT,
  handoff_context JSONB,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ
);

-- Add columns to existing tables
ALTER TABLE issues ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS resolution_summary TEXT;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS satisfaction_score FLOAT;

ALTER TABLE issue_messages ADD COLUMN IF NOT EXISTS intent TEXT;
ALTER TABLE issue_messages ADD COLUMN IF NOT EXISTS entities JSONB;
ALTER TABLE issue_messages ADD COLUMN IF NOT EXISTS confidence FLOAT;
```

---

# 8. FILE STRUCTURE

```
lib/
├── orchestrator.js     # Main flow coordinator
├── intent.js           # Intent classification & entity extraction
├── memory.js           # 3-tier memory management
├── retrieval.js        # RAG routing & multi-collection search
├── escalation.js       # Escalation triggers & handoff
├── respond.js          # Response generation & confidence
├── learning.js         # Fact extraction & case ingestion
├── rag.js              # Legacy RAG (refactor into retrieval.js)
├── issues.js           # Issue CRUD operations
├── workers.js          # Background jobs (BullMQ)
├── config.js           # Bot configuration
├── supabase.js         # Database client
├── qdrant.js           # Vector store client
├── cloudflare.js       # LLM & embedding client
└── forward.js          # Discord forwarding utilities
```

---

# 9. IMPLEMENTATION PHASES

## Phase 1: Conversation Memory (Week 1)
- [ ] Create `lib/memory.js` with working memory
- [ ] Add conversation history to LLM context
- [ ] Test with multi-turn conversations
- [ ] Add thread_summaries table

## Phase 2: Intent & Entities (Week 2)
- [ ] Create `lib/intent.js`
- [ ] Implement intent classification
- [ ] Implement entity extraction
- [ ] Store facts in extracted_facts table
- [ ] Add intent/entities to issue_messages

## Phase 3: Escalation Engine (Week 3)
- [ ] Create `lib/escalation.js`
- [ ] Implement sentiment analysis
- [ ] Implement dead-end detection
- [ ] Implement smart handoff
- [ ] Add escalation_events table

## Phase 4: User Profiles (Week 4)
- [ ] Create user_profiles table
- [ ] Implement cross-thread memory
- [ ] Add VIP detection
- [ ] Promote facts to user profile

## Phase 5: Learning Loop (Week 5)
- [ ] Implement resolved case ingestion
- [ ] Add fact decay mechanism
- [ ] Track resolution quality
- [ ] Measure improvement over time

## Phase 6: Orchestration (Week 6)
- [ ] Create `lib/orchestrator.js`
- [ ] Unify all subsystems
- [ ] Add observability & logging
- [ ] Performance optimization

---

# 10. METRICS TO TRACK

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Recall Accuracy** | >85% | Can bot recall facts from earlier in conversation? |
| **First-Response Resolution** | >60% | Issues resolved without escalation |
| **Escalation Accuracy** | >90% | Escalated issues actually needed human |
| **Response Latency** | <2s | Time from message to response |
| **User Satisfaction** | >4.0/5 | Post-resolution survey |
| **Memory Efficiency** | >60% | Relevant context / total context tokens |
| **Learning Rate** | +5%/month | Improvement in resolution rate from learned cases |

---

# APPENDIX: Quick Reference

## When to Use What

| Situation | Use |
|-----------|-----|
| Simple FAQ | Direct RAG (docs_chunks) |
| Follow-up question | Conversation history + context |
| User-specific info | User profile lookup |
| Complex troubleshooting | Multi-step RAG + may escalate |
| Frustrated user | Immediate escalation |
| VIP customer | Priority routing |
| Resolved issue | Ingest to resolved_cases |
| New documentation | Ingest to docs_chunks |

## Escalation Quick Rules

```javascript
// Immediate escalation
if (sentiment.anger > 0.6) return ESCALATE;
if (policyKeywords.length > 0) return ESCALATE;
if (userRequestedHuman) return ESCALATE;
if (loopCount > 3) return ESCALATE;

// Conditional escalation
if (ragScore < 0.40 && complexity > 0.5) return ESCALATE;
if (vipUser && waitTime > 5min) return PRIORITY_ESCALATE;
```

---

# 11. CONCURRENCY & SCALING

## 11.1 The Problem: 100+ Simultaneous Users

When hundreds of users interact simultaneously, naive implementations fail:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CONCURRENCY FAILURE MODES                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ❌ Rate Limit Exhaustion                                                   │
│     • Discord: 50 req/sec global limit                                      │
│     • OpenAI/Cloudflare: Tiered RPM/TPM limits                              │
│     • Qdrant: Connection pool exhaustion                                    │
│                                                                             │
│  ❌ Race Conditions                                                         │
│     • Two messages from same user → duplicate issue creation                │
│     • Concurrent fact extraction → conflicting writes                       │
│     • Memory updates overwriting each other                                 │
│                                                                             │
│  ❌ Cascading Failures                                                      │
│     • One slow LLM call → blocks entire event loop                          │
│     • Qdrant timeout → all searches queue up                                │
│     • Database lock → thread creation stalls                                │
│                                                                             │
│  ❌ Memory Pressure                                                         │
│     • 100 concurrent conversations in memory → OOM                          │
│     • Unbounded context windows → token explosion                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 11.2 Architecture for Scale

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DISCORD GATEWAY                                 │
│                         (Sharded Connection Pool)                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MESSAGE QUEUE (Redis + BullMQ)                     │
│                                                                              │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│   │   Priority   │  │   Standard   │  │   Learning   │  │  Background  │   │
│   │    Queue     │  │    Queue     │  │    Queue     │  │    Queue     │   │
│   │  (VIP/Urgent)│  │  (Normal)    │  │ (Fact ext.)  │  │ (Decay/etc)  │   │
│   └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          WORKER POOL (Horizontal Scaling)                    │
│                                                                              │
│   Worker 1 ──► Worker 2 ──► Worker 3 ──► Worker 4 ──► Worker N              │
│   (Orchestrator + Memory + RAG + LLM calls)                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
            ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
            │   Supabase   │  │    Qdrant    │  │  Cloudflare  │
            │  (Conn Pool) │  │  (Conn Pool) │  │     LLM      │
            └──────────────┘  └──────────────┘  └──────────────┘
```

## 11.3 Queue System (BullMQ)

```javascript
// lib/queues.js
const Queue = require('bullmq').Queue;
const Worker = require('bullmq').Worker;

// Define queues by priority
const QUEUES = {
  PRIORITY: 'messages:priority',    // VIP, urgent, escalation
  STANDARD: 'messages:standard',    // Normal messages
  LEARNING: 'learning:tasks',       // Fact extraction, case ingestion
  BACKGROUND: 'background:tasks'    // Decay, cleanup, analytics
};

// Create queues with different configurations
const priorityQueue = new Queue(QUEUES.PRIORITY, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 50
  }
});

const standardQueue = new Queue(QUEUES.STANDARD, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 500,
    removeOnFail: 100,
    // Rate limiting per worker
    limiter: {
      max: 10,        // 10 jobs per second
      duration: 1000
    }
  }
});

// Message ingestion - don't block the Discord event loop
async function enqueueMessage(message, context) {
  const priority = determinePriority(context);
  const queue = priority === 'high' ? priorityQueue : standardQueue;
  
  await queue.add('process', {
    messageId: message.id,
    channelId: message.channelId,
    userId: message.author.id,
    content: message.content,
    timestamp: message.createdTimestamp
  }, {
    // Deduplication key
    jobId: `${message.id}:${message.channelId}`,
    // Priority within queue
    priority: priority === 'high' ? 1 : 10
  });
}
```

## 11.4 Worker Configuration

```javascript
// lib/workers.js

// Spawn workers based on CPU cores and I/O characteristics
const WORKER_CONFIG = {
  // CPU-bound workers (intent parsing, entity extraction)
  CPU_WORKERS: Math.min(4, os.cpus().length),
  
  // I/O-bound workers (RAG, database, LLM calls)
  IO_WORKERS: 8,  // Can be higher, limited by external API rates
  
  // Background workers (decay, cleanup)
  BG_WORKERS: 2
};

async function startWorkers() {
  const workers = [];
  
  // Standard message workers
  for (let i = 0; i < WORKER_CONFIG.IO_WORKERS; i++) {
    const worker = new Worker(QUEUES.STANDARD, processMessage, {
      connection: redis,
      concurrency: 5,  // Each worker handles 5 jobs concurrently
      limiter: {
        max: 8,        // 8 jobs per second per worker
        duration: 1000
      }
    });
    workers.push(worker);
  }
  
  // Priority workers (fewer, faster response)
  for (let i = 0; i < WORKER_CONFIG.CPU_WORKERS; i++) {
    const worker = new Worker(QUEUES.PRIORITY, processMessage, {
      connection: redis,
      concurrency: 3,
      limiter: {
        max: 15,       // Higher rate for priority
        duration: 1000
      }
    });
    workers.push(worker);
  }
  
  return workers;
}

// Message processor with full pipeline
async function processMessage(job) {
  const { messageId, content, userId, channelId } = job.data;
  
  try {
    // 1. Get or create issue context
    const context = await getOrCreateContext(channelId, userId);
    
    // 2. Check for duplicate processing (race condition protection)
    const processed = await checkRecentlyProcessed(messageId);
    if (processed) {
      return { status: 'duplicate', messageId };
    }
    
    // 3. Run the full pipeline
    const result = await orchestrator.process({
      message: content,
      context,
      userId,
      channelId
    });
    
    // 4. Mark as processed
    await markProcessed(messageId, result);
    
    return { status: 'success', messageId, result };
    
  } catch (error) {
    // Classify error for retry decision
    if (isRetryable(error)) {
      throw error;  // BullMQ will retry with backoff
    }
    
    // Non-retryable: log and move on
    await logError(messageId, error);
    return { status: 'failed', messageId, error: error.message };
  }
}

function isRetryable(error) {
  // Retry on transient failures
  const RETRYABLE_CODES = ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'EPIPE'];
  const RETRYABLE_STATUS = [429, 502, 503, 504];
  
  return RETRYABLE_CODES.includes(error.code) ||
         RETRYABLE_STATUS.includes(error.status);
}
```

## 11.5 Rate Limiting Strategy

```javascript
// lib/rateLimiter.js
const { RateLimiter } = require('limiter');

// Token bucket rate limiters for external services
const limiters = {
  discord: new RateLimiter({
    tokensPerInterval: 50,
    interval: 'second',
    fireImmediately: true
  }),
  
  cloudflare: new RateLimiter({
    tokensPerInterval: 500,  // Adjust based on tier
    interval: 'minute'
  }),
  
  qdrant: new RateLimiter({
    tokensPerInterval: 100,
    interval: 'second'
  })
};

// Wrapper that respects rate limits
async function withRateLimit(service, fn) {
  const limiter = limiters[service];
  
  if (!limiter) {
    return fn();
  }
  
  const hasTokens = await limiter.removeTokens(1);
  if (!hasTokens) {
    // Queue the request
    await limiter.removeTokens(1);
  }
  
  return fn();
}

// Usage
async function searchQdrant(query) {
  return withRateLimit('qdrant', () => qdrant.search(query));
}

async function callLLM(prompt) {
  return withRateLimit('cloudflare', () => cloudflare.chat(prompt));
}
```

---

# 12. EDGE CASES & ERROR HANDLING

## 12.1 Edge Case Catalog

| Edge Case | Scenario | Detection | Recovery |
|-----------|----------|-----------|----------|
| **Empty Message** | User sends attachment/emoji only | `content.trim() === ''` | Acknowledge attachment, ask for context |
| **Very Long Message** | User pastes 10KB of text | `content.length > 4000` | Truncate + summarize, or escalate |
| **Rapid Fire Messages** | User sends 5+ messages in seconds | Timestamp analysis | Buffer and combine, ask user to slow down |
| **Message Edit** | User edits after bot responded | `message.editedAt` exists | Re-process with edit marker, show what changed |
| **Thread Necro** | User replies to old resolved thread | `lastMessage > 7 days` | Check if new issue or follow-up, may create new issue |
| **Deleted Thread** | User deleted thread, but issue exists | Thread not found | Migrate to new thread or DM |
| **Bot Mention Spam** | Multiple @bot in one message | Count mentions | Single response, acknowledge once |
| **Code/Log Dump** | User pastes error logs | Detect code blocks, stack traces | Extract error, don't ingest as facts |
| **Foreign Language** | Non-English message | Language detection | Try to process, may need translation or escalate |
| **DM Conversation** | User DMs bot directly | `channel.type === 'DM'` | Works but no thread, different UX |
| **Channel Move** | Thread moved to different channel | Channel ID mismatch | Update issue tracking, maintain memory |
| **Permission Loss** | Bot loses send permission | Discord error 50013 | Log + notify admin |
| **User Blocked Bot** | Bot can't DM user | Discord error 50007 | Respond in thread instead |
| **Concurrent Issues** | Same user, multiple threads | Multiple active issues | Link threads or consolidate |

## 12.2 Error Recovery Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ERROR RECOVERY PIPELINE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Error Occurs                                                               │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────────┐                                                        │
│  │ Classify Error  │                                                        │
│  │ • Transient     │──► Retry with exponential backoff                      │
│  │ • Permanent     │──► Log + fallback response                             │
│  │ • Rate Limited  │──► Queue + delay                                       │
│  │ • Data Error    │──► Validate + sanitize + retry                         │
│  └─────────────────┘                                                        │
│       │                                                                     │
│       ▼ (on permanent failure)                                              │
│  ┌─────────────────┐                                                        │
│  │ Graceful        │                                                        │
│  │ Degradation     │                                                        │
│  │ • RAG failed?   │──► Respond without docs + note                         │
│  │ • LLM failed?   │──► Template response + escalate                        │
│  │ • DB failed?    │──► Use cache + alert admin                             │
│  └─────────────────┘                                                        │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────────┐                                                        │
│  │ User            │                                                        │
│  │ Communication   │                                                        │
│  │ "I'm having     │                                                        │
│  │  trouble..."    │                                                        │
│  └─────────────────┘                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 12.3 Circuit Breaker Pattern

```javascript
// lib/circuitBreaker.js
const CircuitBreaker = require('opossum');

// Circuit breaker for external services
const breakerOptions = {
  timeout: 10000,           // 10s timeout
  errorThresholdPercentage: 50,  // Open after 50% failures
  resetTimeout: 30000       // Try again after 30s
};

// Wrap external calls
const qdrantBreaker = new CircuitBreaker(searchQdrant, breakerOptions);
const llmBreaker = new CircuitBreaker(callLLM, breakerOptions);
const dbBreaker = new CircuitBreaker(queryDatabase, breakerOptions);

// Handle circuit states
qdrantBreaker.on('open', () => {
  console.warn('[circuit] Qdrant circuit OPEN - using fallback');
});

qdrantBreaker.on('halfOpen', () => {
  console.log('[circuit] Qdrant circuit HALF-OPEN - testing...');
});

// Fallback functions
async function searchQdrantWithFallback(query) {
  try {
    return await qdrantBreaker.fire(query);
  } catch (error) {
    if (qdrantBreaker.opened) {
      // Circuit is open, use cached or empty results
      return {
        results: [],
        fallback: true,
        message: 'Search temporarily unavailable'
      };
    }
    throw error;
  }
}

async function callLLMWithFallback(prompt, fallbackResponse) {
  try {
    return await llmBreaker.fire(prompt);
  } catch (error) {
    if (llmBreaker.opened) {
      // LLM is down, use template response
      return fallbackResponse || 
        "I'm experiencing some issues right now. A human team member will assist you shortly.";
    }
    throw error;
  }
}
```

## 12.4 Exponential Backoff with Jitter

```javascript
// lib/retry.js
async function withRetry(fn, options = {}) {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    jitter = true
  } = options;
  
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (!isRetryable(error) || attempt === maxAttempts) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      let delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      
      // Add jitter to prevent thundering herd
      if (jitter) {
        delay = delay * (0.5 + Math.random() * 0.5);
      }
      
      console.log(`[retry] Attempt ${attempt} failed, retrying in ${Math.round(delay)}ms`);
      await sleep(delay);
    }
  }
  
  throw lastError;
}

// Usage
const result = await withRetry(
  () => cloudflare.chat(prompt),
  { maxAttempts: 3, baseDelay: 1000 }
);
```

## 12.5 Graceful Degradation Matrix

```javascript
// lib/degradation.js
const DEGRADATION_LEVELS = {
  FULL: 'full',           // All systems operational
  REDUCED_RAG: 'reduced', // RAG timeout increased, fewer results
  NO_RAG: 'no_rag',       // RAG unavailable, use context only
  MINIMAL: 'minimal',     // LLM only, no external services
  EMERGENCY: 'emergency'  // Template responses only
};

function determineDegradationLevel(systems) {
  const { qdrant, supabase, cloudflare, redis } = systems;
  
  if (!cloudflare.healthy) return DEGRADATION_LEVELS.EMERGENCY;
  if (!qdrant.healthy && !supabase.healthy) return DEGRADATION_LEVELS.MINIMAL;
  if (!qdrant.healthy) return DEGRADATION_LEVELS.NO_RAG;
  if (qdrant.latency > 5000) return DEGRADATION_LEVELS.REDUCED_RAG;
  
  return DEGRADATION_LEVELS.FULL;
}

async function respondWithDegradation(context, level) {
  switch (level) {
    case DEGRADATION_LEVELS.FULL:
      return fullPipeline(context);
      
    case DEGRADATION_LEVELS.REDUCED_RAG:
      // Fewer RAG results, faster timeout
      return fullPipeline(context, { ragLimit: 3, ragTimeout: 2000 });
      
    case DEGRADATION_LEVELS.NO_RAG:
      // Skip RAG, use conversation history only
      return respondWithoutRAG(context);
      
    case DEGRADATION_LEVELS.MINIMAL:
      // LLM only, minimal context
      return minimalResponse(context);
      
    case DEGRADATION_LEVELS.EMERGENCY:
      // Template response, promise human follow-up
      return emergencyResponse(context);
  }
}

async function emergencyResponse(context) {
  return {
    content: `I'm experiencing technical difficulties right now. ` +
             `A team member will review your message and respond as soon as possible. ` +
             `Your issue has been logged and assigned ID: ${context.issue.short_id}`,
    shouldEscalate: true,
    degradationLevel: 'emergency'
  };
}
```

---

# 13. PRODUCTION RELIABILITY

## 13.1 Health Checks

```javascript
// lib/health.js
async function healthCheck() {
  const checks = {
    discord: await checkDiscord(),
    supabase: await checkSupabase(),
    qdrant: await checkQdrant(),
    redis: await checkRedis(),
    cloudflare: await checkCloudflare()
  };
  
  const healthy = Object.values(checks).every(c => c.healthy);
  
  return {
    healthy,
    checks,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };
}

async function checkDiscord() {
  try {
    const ping = await client.ping();
    return { healthy: ping < 1000, latency: ping };
  } catch {
    return { healthy: false, error: 'Disconnected' };
  }
}

async function checkQdrant() {
  try {
    const start = Date.now();
    await qdrant.getCollections();
    const latency = Date.now() - start;
    return { healthy: latency < 5000, latency };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}
```

## 13.2 Idempotency & Deduplication

```javascript
// lib/idempotency.js

// Prevent duplicate message processing
const processedMessages = new Map();
const TTL = 5 * 60 * 1000; // 5 minutes

function isProcessed(messageId) {
  const key = `processed:${messageId}`;
  if (processedMessages.has(key)) {
    return true;
  }
  
  processedMessages.set(key, Date.now());
  
  // Cleanup old entries
  if (processedMessages.size > 10000) {
    const now = Date.now();
    for (const [k, v] of processedMessages) {
      if (now - v > TTL) {
        processedMessages.delete(k);
      }
    }
  }
  
  return false;
}

// Idempotent issue creation
async function getOrCreateIssue(threadId, userId) {
  // Use database-level unique constraint
  const { data, error } = await supabase
    .from('issues')
    .upsert(
      { thread_id: threadId, user_id: userId, status: 'open' },
      { onConflict: 'thread_id', ignoreDuplicates: true }
    )
    .select()
    .single();
    
  return data;
}
```

## 13.3 Monitoring & Observability

```javascript
// lib/observability.js

// Metrics to track
const METRICS = {
  // Performance
  messageProcessingTime: histogram('message_processing_ms'),
  ragSearchTime: histogram('rag_search_ms'),
  llmResponseTime: histogram('llm_response_ms'),
  
  // Throughput
  messagesProcessed: counter('messages_processed_total'),
  escalationsTriggered: counter('escalations_total'),
  ragHits: counter('rag_hits_total'),
  ragMisses: counter('rag_misses_total'),
  
  // Errors
  errors: counter('errors_total', ['type', 'service']),
  retries: counter('retries_total', ['service']),
  circuitBreakerTrips: counter('circuit_breaker_trips_total', ['service']),
  
  // Queue
  queueDepth: gauge('queue_depth', ['queue']),
  queueWaitTime: histogram('queue_wait_time_ms', ['queue']),
  
  // Memory
  activeConversations: gauge('active_conversations'),
  contextWindowSize: histogram('context_window_tokens')
};

// Structured logging
function log(level, message, data = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data
  };
  
  console.log(JSON.stringify(entry));
}

// Example usage
async function processMessageWithMetrics(job) {
  const start = Date.now();
  
  try {
    const result = await processMessage(job);
    
    METRICS.messageProcessingTime.observe(Date.now() - start);
    METRICS.messagesProcessed.inc();
    
    log('info', 'Message processed', {
      messageId: job.data.messageId,
      duration: Date.now() - start
    });
    
    return result;
    
  } catch (error) {
    METRICS.errors.inc({ type: error.code || 'unknown', service: 'processor' });
    
    log('error', 'Message processing failed', {
      messageId: job.data.messageId,
      error: error.message,
      stack: error.stack
    });
    
    throw error;
  }
}
```

## 13.4 Dead Letter Queue

```javascript
// lib/deadLetter.js

// Queue for failed messages that exhausted retries
const deadLetterQueue = new Queue('dead_letter', { connection: redis });

async function handleFailedJob(job, error) {
  await deadLetterQueue.add('failed', {
    originalJob: job.data,
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code
    },
    failedAt: new Date().toISOString(),
    attempts: job.attemptsMade
  });
  
  // Alert admins for critical failures
  if (job.data.priority === 'high') {
    await alertAdmins(`High priority job failed: ${job.data.messageId}`);
  }
}

// Admin endpoint to replay dead letter messages
async function replayDeadLetter(jobId) {
  const job = await deadLetterQueue.getJob(jobId);
  if (!job) throw new Error('Job not found');
  
  // Re-queue to original queue
  const queue = determineQueue(job.data.originalJob);
  await queue.add('process', job.data.originalJob);
  
  // Remove from dead letter
  await job.remove();
}
```

## 13.5 Configuration Management

```javascript
// lib/config.js

// Feature flags for gradual rollout
const FEATURES = {
  QUERY_REFORMULATION: process.env.FEATURE_QUERY_REFORMULATION === 'true',
  MULTI_COLLECTION_RAG: process.env.FEATURE_MULTI_COLLECTION_RAG === 'true',
  USER_PROFILES: process.env.FEATURE_USER_PROFILES === 'true',
  AUTO_ESCALATION: process.env.FEATURE_AUTO_ESCALATION === 'true'
};

// Dynamic thresholds (can be updated without redeploy)
const THRESHOLDS = {
  RAG_MIN_SCORE: parseFloat(process.env.RAG_MIN_SCORE || '0.40'),
  ESCALATION_THRESHOLD: parseFloat(process.env.ESCALATION_THRESHOLD || '0.60'),
  MAX_CONTEXT_TOKENS: parseInt(process.env.MAX_CONTEXT_TOKENS || '8000'),
  MAX_RETRY_ATTEMPTS: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3')
};

// Rate limits (adjustable)
const RATE_LIMITS = {
  DISCORD_RPS: parseInt(process.env.DISCORD_RPS || '50'),
  LLM_RPM: parseInt(process.env.LLM_RPM || '500'),
  QDRANT_RPS: parseInt(process.env.QDRANT_RPS || '100')
};

// Reload config from environment (call on SIGHUP)
function reloadConfig() {
  Object.assign(THRESHOLDS, {
    RAG_MIN_SCORE: parseFloat(process.env.RAG_MIN_SCORE || '0.40'),
    // ... other thresholds
  });
  
  log('info', 'Configuration reloaded', { THRESHOLDS, FEATURES });
}

process.on('SIGHUP', reloadConfig);
```

---

# 14. DEPLOYMENT CHECKLIST

## Pre-Launch

- [ ] Redis running with persistence enabled
- [ ] BullMQ queues created and workers deployed
- [ ] Circuit breakers configured for all external services
- [ ] Health check endpoints accessible
- [ ] Rate limiters match API tier limits
- [ ] Dead letter queue has monitoring/alerting
- [ ] Log aggregation configured (structured JSON)
- [ ] Metrics collection enabled
- [ ] Graceful shutdown handlers installed

## Monitoring Setup

- [ ] Alert on circuit breaker trips
- [ ] Alert on dead letter queue growth
- [ ] Alert on queue depth > 100
- [ ] Alert on error rate > 5%
- [ ] Alert on response latency > 5s
- [ ] Dashboard for message throughput
- [ ] Dashboard for RAG hit/miss ratio
- [ ] Dashboard for escalation rate

## Runbook

| Alert | Immediate Action | Investigation |
|-------|-----------------|---------------|
| Circuit breaker open | Check service status, may need to increase timeout | Review error logs for root cause |
| Queue depth > 100 | Scale workers or check for blocked jobs | Check for slow LLM/Qdrant calls |
| Error rate > 5% | Check external service status | Review error types in logs |
| Dead letter growing | Review failed jobs, may need code fix | Check for bad data or API changes |
| High latency | Check network, may need to reduce context | Profile slow operations |
