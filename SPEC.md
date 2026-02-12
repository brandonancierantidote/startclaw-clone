# THE ONE — Product Specification v1.0

## Master Blueprint for Alpha Launch

**Document Version:** 1.0
**Date:** February 12, 2026
**Codename:** Project StartClaw-Clone → "The One"
**Status:** Alpha Specification — 7-Day Build Sprint

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Positioning](#2-product-vision--positioning)
3. [User Journey — End to End](#3-user-journey--end-to-end)
4. [Pricing & Business Model](#4-pricing--business-model)
5. [Template Library — Launch 20](#5-template-library--launch-20)
6. [Onboarding System — Dual Path](#6-onboarding-system--dual-path)
7. [Technical Architecture](#7-technical-architecture)
8. [AI Gateway & Model Strategy](#8-ai-gateway--model-strategy)
9. [Financial Kill-Switch System](#9-financial-kill-switch-system)
10. [Security & Tenant Isolation](#10-security--tenant-isolation)
11. [Integration Priorities](#11-integration-priorities)
12. [Activity Summary Dashboard](#12-activity-summary-dashboard)
13. [Tech Stack — Confirmed](#13-tech-stack--confirmed)
14. [Database Schema — Core Tables](#14-database-schema--core-tables)
15. [API Routes — Core Endpoints](#15-api-routes--core-endpoints)
16. [7-Day Alpha Build Plan](#16-7-day-alpha-build-plan)
17. [MVP vs V2 Scope Boundaries](#17-mvp-vs-v2-scope-boundaries)
18. [Competitive Landscape Reference](#18-competitive-landscape-reference)
19. [Open Questions & Risks](#19-open-questions--risks)

---

## 1. Executive Summary

**The One** is a turnkey managed hosting platform for OpenClaw AI agents. It targets non-technical creative professionals and entrepreneurs who want a 24/7 AI employee without touching a terminal, managing API keys, or configuring servers.

**Core Value Proposition:**
"The only AI employee you need. Pick a template. Answer a few questions. Your agent starts working in 5 minutes."

**How we're different from the 36+ OpenClaw hosting competitors:**

- **No API keys required.** We provide the AI "fuel" via master API keys. Users never see a token or API dashboard.
- **Guided template gallery** with specific, outcome-driven use cases (not generic "Personal Productivity" categories).
- **Conversational AI onboarding** — a chat that asks you about your needs and configures the agent for you.
- **We pick the best model for the task.** Users don't choose between Claude/GPT/Gemini — we route intelligently. This is a major value prop and differentiator.
- **Predictable credit system** with $25 auto-recharge chunks. No surprise $600 bills.
- **Cleanest, most professional UI** in the space. Trustworthy. Legitimate. Non-intimidating.

**Branding:**
- Product name: **The One** (working name, subject to domain availability)
- Tagline candidates: "Your 24/7 AI Employee" / "The Only AI Assistant You Need"
- OpenClaw reference: "Powered by OpenClaw" in footer. Used in SEO/marketing copy, not in primary brand.
- Domain candidates: gettheone.ai, theone.so, meettheone.ai, theone.app

---

## 2. Product Vision & Positioning

### Target User Persona

**Name:** "Alex" — a 28-42 year old creative professional or small business owner.

**Characteristics:**
- Uses AI tools (ChatGPT, Claude, Midjourney) but doesn't code
- Has heard about OpenClaw on social media and is intrigued
- Does NOT want to buy a Mac Mini, set up Docker, or manage API keys
- Privacy-conscious — nervous about giving an AI "access to their computer"
- Willing to pay $29-50/mo for something that saves them real time
- Reachable via META ads (Instagram, Facebook) and Google SEM

**What Alex says:**
- "I saw OpenClaw on Twitter and it looks amazing but I don't want to deal with the setup"
- "I'd pay for someone to just handle all the technical stuff"
- "I don't want to accidentally spend $500 on AI tokens"

### Positioning Statement

For non-technical professionals who want the power of an OpenClaw AI agent, **The One** is the first turnkey AI employee platform that gets you from signup to a working agent in under 5 minutes — with no terminal, no API keys, and no surprise bills. Unlike StartClaw ($49+), DoneClaw, and other hosting providers that still require technical configuration, **The One** guides you through setup with a conversational AI, picks the best AI model automatically, and protects you with predictable $25 credit recharges.

### Competitive Positioning Map

| Feature | The One | StartClaw | DoneClaw | Self-Hosted |
|---|---|---|---|---|
| Starting Price | $29/mo | $49/mo | $39/mo | $0 + API costs |
| Credits Included | Yes ($10 starter) | Yes ($15) | Yes (TBD) | N/A |
| API Keys Required | No | BYOK option | BYOK option | Yes, mandatory |
| Template Gallery | 20+ guided templates | Basic categories | Basic categories | None |
| Conversational Setup | Yes (AI onboarding) | No | No | No |
| Model Auto-Selection | Yes | No (user picks) | No (user picks) | Manual config |
| Credit Kill-Switch | 3-layer protection | Basic limits | Basic limits | None |
| Target Audience | Non-technical | Semi-technical | Semi-technical | Developers |

---

## 3. User Journey — End to End

### Phase 1: Discovery & Signup (No cost, no card)

```
1. User lands on homepage (from META ad, SEM, or organic)
2. Homepage shows: hero section + template gallery preview + social proof
3. CTA: "Get Your AI Employee" → Sign up with Clerk (Google/email)
4. NO credit card required at this stage
```

### Phase 2: Template Selection & Onboarding (Still free)

```
5. User enters Template Gallery — grid of 20+ cards with specific outcomes
   Example cards:
   - "Inbox Zero Agent — Clean up your email every morning"
   - "Morning Briefing — Start your day with a WhatsApp summary"
   - "Content Ideas Generator — 5 fresh ideas delivered daily"

6. TWO PATHS (user chooses):
   PATH A — Pick a Template:
     → User clicks a template card
     → Mini onboarding form: 3-5 specific questions
       (e.g., for Inbox Zero: "What email? What counts as junk?
        What time should your summary arrive?")
     → System generates SOUL.md from answers

   PATH B — Talk to AI:
     → User clicks "Not sure? Let's figure it out together"
     → Conversational AI chat asks about their work, pain points, goals
     → AI recommends a template (or creates a custom one)
     → System generates SOUL.md from conversation
```

### Phase 3: Connect Integrations (Still free)

```
7. Based on the template, the system shows relevant integrations:
   - "Your Inbox Zero Agent needs access to Gmail. Connect now?"
   - "Want your Morning Briefing on WhatsApp? Scan this QR code."
   - "Connect Google Calendar for meeting prep?"

8. User connects 1-3 integrations via OAuth or QR code
   (WhatsApp = QR scan, Gmail = Google OAuth, Slack = Slack OAuth)

9. User sees a preview: "Here's what your agent will do for you"
   - Summary of the SOUL.md in plain English
   - Connected integrations listed
   - Estimated credit usage per day
```

### Phase 4: Paywall & Activation

```
10. CTA: "Activate Your Agent — $29/month"
    - Stripe Checkout
    - Clearly states: "$29/mo includes platform + $10 in starter credits"
    - Checkbox (pre-checked): "Auto-recharge $25 when credits run low"
    - User can uncheck to disable auto-recharge

11. Payment succeeds → Backend spins up OpenClaw container
    - Pre-configured with user's SOUL.md
    - Connected to their integrations
    - Routed through our AI gateway (LiteLLM)
    - Token limits applied per the kill-switch system

12. Agent goes live. User gets first message:
    "Hi [Name]! I'm your [Template Name]. I'm set up and ready to go.
     Here's what I'll be doing for you: [summary]. Talk to me anytime!"
```

### Phase 5: Ongoing Usage

```
13. User interacts with agent via WhatsApp/Slack/Telegram
14. Credits deplete based on token usage
15. At 20% remaining credits:
    - User gets notification: "Your credits are running low.
      Auto-recharge of $25 will kick in shortly."
    - If auto-recharge enabled: charge $25, add credits
    - If disabled: "Your agent will pause when credits hit $0.
      Tap here to add credits."
16. User can view Activity Summary in dashboard at any time
17. Monthly subscription auto-renews at $29/mo
```

---

## 4. Pricing & Business Model

### Subscription

| Item | Amount | Notes |
|---|---|---|
| Monthly Platform Fee | $29/mo | Includes hosting, gateway, dashboard, support |
| Starter Credits (included) | ~$10 worth | Enough for ~3-7 days of moderate usage |
| Auto-Recharge Chunk | $25 per recharge | Triggered at 20% remaining balance |
| Payment Processing | Stripe (2.9% + $0.30) | |

### Unit Economics Per User

| Cost Item | Estimated Monthly |
|---|---|
| Compute (shared container) | $2-4/mo |
| AI Gateway overhead | $0.50/mo |
| Stripe fees on $29 | ~$1.15/mo |
| Starter credits pass-through | ~$6-7 (our cost at wholesale) |
| **Total COGS** | **~$10-13/mo** |
| **Gross Margin** | **~$16-19/mo (55-65%)** |

### Credit Economics

| Item | Detail |
|---|---|
| User pays | $25 per recharge |
| Our cost (wholesale API tokens) | ~$15-17.50 (60-70% of face value) |
| **Credit margin** | **$7.50-10 per recharge (30-40%)** |
| Markup rationale | Covers gateway infrastructure, kill-switch monitoring, convenience premium |

### Why $29 Works

- **Cheaper than StartClaw** ($49 starter) and ClawNest ($49 starter)
- **Competitive with DoneClaw** ($39) while offering better UX
- **Above the floor** — covers paid acquisition costs ($15-25 CAC on META)
- **Includes starter credits** — user sees immediate value on Day 1
- **No Pro tier at launch** — simplicity is the feature. One plan. One price.

### Future Pricing Expansion (V2+)

- If users hit compute limits → introduce Pro tier at $49/mo with dedicated resources
- BYO-Key toggle → same $29/mo fee but no credit charges (users save on tokens)
- Team/Org accounts → $29/user/mo with shared billing

---

## 5. Template Library — Launch 20

Each template has: a display name, a one-line hook (for the card), a META ad angle, the SOUL.md personality instructions, required integrations, and 3-5 onboarding questions.

### Email & Communication

| # | Template Name | Card Hook | Required Integrations | Ad Angle |
|---|---|---|---|---|
| 1 | **Inbox Zero Agent** | Clean up your email every morning | Gmail | "I installed an AI that unsubscribes from junk and gives me a clean inbox summary every morning" |
| 2 | **Email Draft Assistant** | AI-drafted replies in your tone, ready for one-tap approval | Gmail | "My AI reads my emails and writes replies for me. I just tap approve." |
| 3 | **Follow-Up Tracker** | Never let an important email slip through the cracks | Gmail | "My AI tracks every email I'm waiting on and reminds me to follow up" |

### Morning Routine & Daily Operations

| # | Template Name | Card Hook | Required Integrations | Ad Angle |
|---|---|---|---|---|
| 4 | **Morning Briefing** | Start every day with a personalized WhatsApp summary | Gmail, Calendar, WhatsApp/Slack | "Every morning at 7am my AI sends me my day: meetings, priority emails, weather, and a suggested to-do list" |
| 5 | **End-of-Day Wrap-Up** | Close out your day and prep for tomorrow | Gmail, Calendar, WhatsApp/Slack | "At 6pm my AI tells me what I accomplished, what's still open, and what tomorrow looks like" |
| 6 | **Meeting Prep Agent** | Walk into every meeting fully prepared | Calendar, Gmail | "Before every meeting, my AI sends me a brief on who I'm meeting and what to discuss" |

### Research & Discovery

| # | Template Name | Card Hook | Required Integrations | Ad Angle |
|---|---|---|---|---|
| 7 | **Personal Research Assistant** | Deep research on anything, delivered via chat | WhatsApp/Slack | "I asked my AI to find 10 suppliers under $50K and compare them. Got a full report in 20 minutes." |
| 8 | **Restaurant & Experience Finder** | Find the perfect spot for any occasion | WhatsApp/Slack | "I text my AI 'date night Friday, Italian, outdoor seating' and it finds me 5 perfect options" |
| 9 | **Price Watch Agent** | Get alerts when prices drop on things you want | WhatsApp/Slack | "My AI watches Amazon prices for me and texts me when something I want goes on sale" |
| 10 | **Competitor Watch** | Know what your competitors are doing before they announce it | WhatsApp/Slack | "Every Monday my AI sends me everything my competitors posted, launched, or changed last week" |

### Content & Social Media

| # | Template Name | Card Hook | Required Integrations | Ad Angle |
|---|---|---|---|---|
| 11 | **Content Ideas Generator** | 5 fresh content ideas delivered to you every morning | WhatsApp/Slack | "I wake up to 5 content ideas tailored to my niche. My AI knows what performs well." |
| 12 | **Social Media Drafter** | One idea in → platform-ready posts out | WhatsApp/Slack | "I send my AI one idea and get back an IG caption, LinkedIn post, and tweet — all in my voice" |
| 13 | **Hashtag & Trend Spotter** | Catch trends in your niche before everyone else | WhatsApp/Slack | "My AI monitors trending topics in my industry and alerts me when I should post about something" |

### Smart Home & Personal

| # | Template Name | Card Hook | Required Integrations | Ad Angle |
|---|---|---|---|---|
| 14 | **Smart Home Controller** | Control your home from WhatsApp | WhatsApp, Home Assistant APIs | "'Turn off the lights, lock the door, set thermostat to 68' — all from a text message" |
| 15 | **Family Coordinator** | Keep the whole family organized without being the nag | Calendar, WhatsApp | "My AI manages the family calendar. It reminds my kids about practice and my partner about grocery pickup." |

### Business Operations

| # | Template Name | Card Hook | Required Integrations | Ad Angle |
|---|---|---|---|---|
| 16 | **Invoice & Expense Tracker** | Snap a receipt, get it categorized automatically | Gmail, WhatsApp | "I take a photo of every receipt. My AI categorizes them and sends me a weekly spending summary." |
| 17 | **Client Onboarding Assistant** | Automate the first 48 hours of every new client | Gmail, Calendar, Slack | "When I get a new client, my AI sends the welcome email, collects info, and books the kickoff call" |
| 18 | **Appointment Setter** | Never miss a lead — respond in seconds, 24/7 | WhatsApp, Calendar | "Leads message me at 2am. My AI responds instantly, shares my availability, and books the call." |

### Learning & Wellness

| # | Template Name | Card Hook | Required Integrations | Ad Angle |
|---|---|---|---|---|
| 19 | **Daily Learning Digest** | Get smarter every day without doing the research | WhatsApp/Slack | "My AI curates articles and podcasts about [topic] every morning. Like a personal news feed that matters." |
| 20 | **Habit Tracker & Accountability Partner** | An AI that checks in on you and keeps you honest | WhatsApp | "Every day my AI asks if I worked out, drank water, and read. It tracks my streaks and won't let me slide." |

### Onboarding Questions Example (Inbox Zero Agent)

```
Q1: "What email account should I manage?" → Gmail OAuth
Q2: "What types of emails are important to you? (client emails, invoices, personal...)"
Q3: "What should I do with newsletters? Unsubscribe, archive, or keep?"
Q4: "What time should I send your daily clean inbox summary?"
Q5: "Which channel should I send your summary to? (WhatsApp / Slack)"
```

The SOUL.md is auto-generated from these answers using a template-specific prompt template.

---

## 6. Onboarding System — Dual Path

### Path A: Template-First (expected 80% of users)

```
User Flow:
1. Browse template gallery (grid of cards)
2. Click a template card → see detailed description + preview
3. Click "Set Up This Agent"
4. 3-5 question form (specific to template)
5. Connect required integrations
6. Preview agent configuration in plain English
7. Pay $29 → Agent goes live
```

**Implementation:**
Each template has a JSON config file defining:
- `soul_template` — the SOUL.md with {{placeholder}} variables
- `onboarding_questions` — array of questions with types (text, select, oauth)
- `required_integrations` — which OAuth flows to trigger
- `default_model` — which AI model to use
- `estimated_daily_credits` — for the cost preview

### Path B: Conversational AI (expected 20% of users)

```
User Flow:
1. Click "Not sure? Let's figure it out together"
2. Chat interface opens with a friendly AI
3. AI asks: "What do you do for work?"
4. AI asks: "What's the most annoying repetitive task in your day?"
5. AI asks: "How do you usually communicate? WhatsApp, Slack, email?"
6. AI recommends 2-3 templates with explanations
7. User picks → flows into Path A's question form
8. Or: AI generates a custom SOUL.md from the conversation
```

**Implementation:**
- Lightweight chat UI using our AI gateway
- System prompt instructs the model to assess needs, map to templates, recommend
- Uses Claude Sonnet via LiteLLM
- Cost: ~$0.02-0.05 per onboarding conversation (negligible)

---

## 7. Technical Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    FRONTEND (Vercel)                       │
│                   Next.js 15 + Tailwind                   │
│                                                            │
│  ┌────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │  Template   │  │  Onboarding   │  │   Dashboard     │  │
│  │  Gallery    │  │  Chat / Forms │  │   (Activity)    │  │
│  └────────────┘  └───────────────┘  └─────────────────┘  │
└──────────────────────────┬───────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│               API LAYER (Next.js API Routes)              │
│  Auth (Clerk) │ Billing (Stripe) │ Agent CRUD │ Credits  │
└──────────────────────────┬───────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
┌──────────────┐  ┌────────────┐  ┌───────────────────────┐
│   Supabase   │  │   Stripe   │  │  Container Host       │
│  (Postgres)  │  │  Webhooks  │  │  (Hetzner Server)     │
│              │  │            │  │                         │
│  - Users     │  │  - Subs    │  │  ┌─────────────────┐  │
│  - Agents    │  │  - Credits │  │  │ User Containers  │  │
│  - Credits   │  │  - Recharge│  │  │ (Docker isolate) │  │
│  - Templates │  │            │  │  │ + SOUL.md        │  │
│  - Activity  │  │            │  │  │ + OpenClaw       │  │
│  - Sessions  │  │            │  │  └────────┬────────┘  │
└──────────────┘  └────────────┘  │           │           │
                                  │           ▼           │
                                  │  ┌─────────────────┐  │
                                  │  │   AI GATEWAY    │  │
                                  │  │   (LiteLLM)     │  │
                                  │  │  + Rate Limiter  │  │
                                  │  │  + Cost Tracker  │  │
                                  │  │  + Model Router  │  │
                                  │  └────────┬────────┘  │
                                  └───────────┼───────────┘
                                              │
                                 ┌────────────┼────────────┐
                                 ▼            ▼            ▼
                           ┌──────────┐ ┌──────────┐ ┌──────────┐
                           │ Anthropic│ │  OpenAI  │ │  Google  │
                           │ Claude   │ │  GPT     │ │  Gemini  │
                           └──────────┘ └──────────┘ └──────────┘
```

### Key Architectural Decisions

**1. Shared Infrastructure (Alpha)**
- Single Hetzner dedicated server (8 vCPU, 32-64GB RAM, ~$40-63/mo)
- Docker Compose with one container per user agent
- Network isolation via Docker networks (each container isolated)
- Scales to ~10-15 concurrent users on one server
- V2: Move to Kubernetes or Railway for auto-scaling

**2. AI Gateway (LiteLLM)**
- Self-hosted LiteLLM proxy on the same Hetzner server
- Single entry point for all LLM API calls from all user containers
- Handles: model routing, cost tracking, retries, fallbacks
- Master API keys live ONLY in LiteLLM config (never in user containers)
- User containers call LiteLLM with a per-user virtual key

**3. Database (Supabase)**
- Hosted Postgres with Row Level Security (RLS)
- Real-time subscriptions for dashboard updates
- Free tier sufficient for alpha

**4. Auth (Clerk)**
- Handles signup, login, session management
- Webhooks to Supabase on user creation
- Free tier: 10,000 MAU

**5. Payments (Stripe)**
- Subscription ($29/mo) via Stripe Checkout
- Auto-recharge via Stripe Payment Intents (saved payment method)
- Webhooks for: subscription created, payment succeeded, payment failed

---

## 8. AI Gateway & Model Strategy

### Model Selection Philosophy

**We pick the best model. Users don't choose.** This is a core differentiator.

```
Marketing copy: "We automatically use the best AI model for every task.
No dropdowns. No confusion. Just the smartest choice, every time."
```

### Default Model Routing (Alpha)

| Use Case | Model | Rationale |
|---|---|---|
| Primary agent conversations | Claude Sonnet 4.5 | Best quality-to-cost ratio |
| Onboarding chat (Path B) | Claude Sonnet 4.5 | Needs to be smart |
| Activity summary generation | Claude Haiku 4.5 | Summarization, cost-efficient |
| Simple responses | Claude Haiku 4.5 | Don't waste Sonnet on "Good morning!" |
| Browser automation | Claude Sonnet 4.5 | Needs vision + reasoning |

### V2 Model Expansion

- Add GPT-5.2 as option for users who prefer it
- Add Gemini 3 Flash for cost-sensitive high-volume templates
- Smart routing: Haiku for simple tasks, Sonnet for complex ones (auto-detected)
- Advanced dropdown (hidden by default): "Choose your agent's brain"

### LiteLLM Configuration

```yaml
model_list:
  - model_name: "agent-primary"
    litellm_params:
      model: "claude-sonnet-4-5-20250929"
      api_key: "os.environ/ANTHROPIC_API_KEY"
      max_tokens: 4096
  - model_name: "agent-light"
    litellm_params:
      model: "claude-haiku-4-5-20251001"
      api_key: "os.environ/ANTHROPIC_API_KEY"
      max_tokens: 2048
  - model_name: "agent-primary-fallback"
    litellm_params:
      model: "gpt-4.1"
      api_key: "os.environ/OPENAI_API_KEY"
      max_tokens: 4096

general_settings:
  master_key: "os.environ/LITELLM_MASTER_KEY"
  database_url: "os.environ/LITELLM_DB_URL"

litellm_settings:
  max_budget: 500
  budget_duration: "monthly"
  num_retries: 2
  request_timeout: 60
  fallbacks:
    - agent-primary:
        - agent-primary-fallback
```

---

## 9. Financial Kill-Switch System

### The Three-Layer Defense

#### Layer 1: Per-Execution Token Ceiling

```
Every single agent run has a hard token limit.

- Limit: 80,000 tokens per execution chain
- Action: LiteLLM force-terminates the request
- User sees: "This task was too complex for a single run.
  Try breaking it into smaller steps."
- Implementation: LiteLLM max_tokens + custom callback
```

#### Layer 2: Per-Hour Rolling Window Rate Limit

```
Rapid-fire runs are capped even if individually under budget.

- Limit: 200,000 tokens per rolling hour per user
- Action: Requests queued/rejected with friendly message
- User sees: "Your agent is working hard! Taking a short breather
  to manage costs. It'll resume in a few minutes."
- Implementation: Upstash Redis sliding window counter per user_id
```

#### Layer 3: Real-Time Credit Balance Check (PRE-CALL)

```
Before EVERY LLM API call leaves the gateway:

1. Estimate cost of this call (model + estimated tokens)
2. Check user's credit balance in Redis cache
3. If balance < estimated_cost → REJECT before hitting upstream API
4. If balance > estimated_cost → ALLOW and deduct estimated cost
5. After call completes → reconcile actual cost vs estimated

User sees (when blocked): "Your credits are running low!
[Add $25 Credits] or [Enable Auto-Recharge]"
```

#### Auto-Recharge Flow

```
1. Balance drops below 20% of last recharge ($5 of $25)
2. Notification sent via connected channel:
   "Your agent credits are getting low.
    Auto-recharge of $25 will process shortly."
3. If auto-recharge enabled:
   → Charge $25 to saved Stripe payment method
   → Add credits to balance
   → Confirm: "All topped up! Your agent is still running."
4. If auto-recharge disabled:
   → Warning: "Your agent will pause when credits run out.
     Tap here to add credits: [link]"
5. If balance hits $0:
   → Agent sends final message: "I'm taking a short break.
     My owner will have me back online soon!"
   → Container paused (not deleted)
   → Dashboard shows: "Agent Paused — Add Credits to Resume"
```

#### Cost Tracking Architecture

```
LiteLLM API Call
  ├── Helicone logging (model, tokens, cost, latency, user_id)
  ├── Redis credit cache update (real-time balance)
  └── Supabase async write (usage_logs for dashboard/billing)

Credit balance maintained in TWO places:
- Redis: real-time, for pre-call checks, refreshed from Supabase hourly
- Supabase: persistent, source of truth, for billing and dashboard
```

---

## 10. Security & Tenant Isolation

### Alpha Architecture (Docker Network Isolation)

```
Hetzner Server
├── Docker Network: "gateway" (shared — LiteLLM + orchestrator)
├── Docker Network: "user_abc123" (isolated)
│   └── Container: openclaw_abc123
│       ├── OpenClaw instance + SOUL.md + memory files
│       └── ENV: LITELLM_VIRTUAL_KEY=vk_abc123
├── Docker Network: "user_def456" (isolated)
│   └── Container: openclaw_def456
│       ├── OpenClaw instance + SOUL.md + memory files
│       └── ENV: LITELLM_VIRTUAL_KEY=vk_def456
└── Docker Network: "infra" (internal only)
    ├── Container: litellm_proxy
    ├── Container: redis
    └── Container: orchestrator_api
```

### Security Rules

1. **No shared environment variables.** Each container gets only its own LiteLLM virtual key. Master API keys exist ONLY in the LiteLLM container.
2. **Network isolation.** Each user container on its own Docker network. No container-to-container communication.
3. **Volume isolation.** Each user's SOUL.md and memory in separate Docker volumes.
4. **Iptables rules** prevent container-to-container communication.
5. **LiteLLM virtual keys** are per-user with individual budget limits.

### V2 Security Upgrades

- Firecracker microVMs for kernel-level isolation
- Secrets management via Infisical
- SOC 2 compliance preparation
- Regular security audits

---

## 11. Integration Priorities

### Launch Integrations (Alpha)

| Priority | Integration | Type | Connection Method | Notes |
|---|---|---|---|---|
| P0 | **WhatsApp** | Messaging | QR Code scan | Sessions expire; user re-scans. Most important channel. |
| P0 | **Slack** | Messaging | Slack OAuth | Standard OAuth. Great for business users. |
| P1 | **Gmail** | Tool | Google OAuth | Required for email templates. |
| P1 | **Google Calendar** | Tool | Google OAuth (same consent) | Required for briefing/meeting templates. |
| P2 | **Telegram** | Messaging | Bot Token | Easiest setup. Less relevant for non-technical audience. |
| P2 | **Discord** | Messaging | Bot Token + OAuth | Community-oriented users. |

### V2 Integrations

- iMessage (requires Mac infrastructure)
- Twitter/X API
- Spotify, Obsidian/Notion, Home Assistant
- Shopify (e-commerce templates)

### Integration Connection Flow in UI

```
┌──────────────────────────────────────────┐
│  Connect Your Services                    │
│                                           │
│  Your Inbox Zero Agent needs:             │
│                                           │
│  ✅ Gmail                                 │
│     [Connect Gmail →]                     │
│                                           │
│  📱 Where should I send your summary?     │
│  ○ WhatsApp  [Scan QR Code]             │
│  ○ Slack     [Connect Slack →]           │
│  ○ Telegram  [Get Bot Link →]           │
│                                           │
│  Optional:                                │
│  □ Google Calendar (meeting-aware)        │
│     [Connect Calendar →]                  │
│                                           │
│  [Continue →]                             │
└──────────────────────────────────────────┘
```

---

## 12. Activity Summary Dashboard

### Dashboard Layout

```
┌──────────────────────────────────────────────────────┐
│  THE ONE — Dashboard                   [Alex ▾] [⚙️] │
├──────────────────────────────────────────────────────┤
│                                                        │
│  Agent Status: 🟢 Active                               │
│  Template: Inbox Zero Agent                            │
│  Credits: ██████████░░ $18.40 / $25.00                 │
│  Auto-recharge: ✅ Enabled ($25 chunks)                │
│                                                        │
│  ┌────────────────────────────────────────────────┐   │
│  │  📊 TODAY'S SUMMARY                             │   │
│  │                                                  │   │
│  │  Your agent handled 23 tasks today:              │   │
│  │  • Processed 147 emails — archived 89, flagged 12│   │
│  │  • Unsubscribed from 6 newsletters               │   │
│  │  • Sent morning summary at 7:02 AM               │   │
│  │  • Drafted 3 reply suggestions (2 approved)       │   │
│  │                                                  │   │
│  │  Credits used today: $1.85                       │   │
│  │  Est. days until recharge: 9                     │   │
│  │                                                  │   │
│  │  💬 Ask about your activity...          [Ask →]  │   │
│  └────────────────────────────────────────────────┘   │
│                                                        │
│  ┌────────────────────────────────────────────────┐   │
│  │  📋 RECENT ACTIVITY                             │   │
│  │                                                  │   │
│  │  2:34 PM — Archived 12 promotional emails        │   │
│  │  2:30 PM — Drafted reply to Sarah K.             │   │
│  │  11:15 AM — Unsubscribed from DailyTech          │   │
│  │  7:02 AM — Sent morning briefing via WhatsApp    │   │
│  │  7:00 AM — Scanned 47 new emails                 │   │
│  │  [Load more...]                                  │   │
│  └────────────────────────────────────────────────┘   │
│                                                        │
│  [⚙️ Settings]  [📝 Edit Agent]  [➕ Add Agent]       │
└──────────────────────────────────────────────────────┘
```

### "Ask About Activity" Feature

Simple prompt-and-response (NOT a separate AI layer):

```
1. Fetch last 24h of activity logs from Supabase
2. Send to Claude Haiku with prompt:
   "Here are the activity logs for this user's AI agent.
    The user is asking: '{user_question}'
    Provide a clear, concise answer based on the logs."
3. Display response inline

Cost: ~$0.01-0.03 per question (Haiku is very cheap)
```

---

## 13. Tech Stack — Confirmed

| Layer | Technology | Cost (Alpha) |
|---|---|---|
| **Frontend** | Next.js 15 (App Router) + Tailwind + shadcn/ui | Free (Vercel) |
| **Auth** | Clerk | Free (10K MAU) |
| **Database** | Supabase (Postgres + Realtime) | Free tier |
| **Payments** | Stripe (Subscriptions + Payment Intents) | 2.9% + $0.30/tx |
| **AI Gateway** | LiteLLM (self-hosted) | Free |
| **AI Observability** | Helicone | Free (10K req/mo) |
| **Rate Limiting** | Upstash Redis | Free (10K cmd/day) |
| **Container Host** | Hetzner Dedicated (8+ vCPU, 32-64GB RAM) | ~$40-63/mo |
| **Container Runtime** | Docker + Docker Compose | Free |
| **Agent Runtime** | OpenClaw (latest stable, pinned) | Free (MIT) |
| **DNS/CDN** | Cloudflare | Free |
| **Secrets** | Docker secrets (alpha) → Infisical (V2) | Free |

### Total Monthly Infrastructure (Alpha, <50 users)

```
Hetzner server:     ~$63/mo
Domains:             ~$1/mo
Stripe fees (est.):  ~$50/mo (on ~$1,500 revenue)
AI API pass-through: ~$200-400/mo (covered by user credits)
Everything else:     Free tier
─────────────────
Fixed overhead:      ~$115/mo
```

---

## 14. Database Schema — Core Tables

```sql
-- USERS (synced from Clerk via webhook)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- SUBSCRIPTIONS
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'inactive',
  plan TEXT NOT NULL DEFAULT 'standard',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CREDITS
CREATE TABLE credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  balance_cents INTEGER NOT NULL DEFAULT 0,
  auto_recharge_enabled BOOLEAN DEFAULT true,
  recharge_amount_cents INTEGER DEFAULT 2500,
  low_balance_threshold_cents INTEGER DEFAULT 500,
  last_recharge_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- AGENTS
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  template_slug TEXT NOT NULL,
  display_name TEXT NOT NULL,
  soul_md TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  container_id TEXT,
  litellm_virtual_key TEXT,
  model_primary TEXT DEFAULT 'claude-sonnet-4-5-20250929',
  model_light TEXT DEFAULT 'claude-haiku-4-5-20251001',
  config JSONB DEFAULT '{}',
  integrations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- USAGE LOGS
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  cost_cents INTEGER DEFAULT 0,
  request_type TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ACTIVITY FEED
CREATE TABLE activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CREDIT TRANSACTIONS (audit trail)
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  balance_after_cents INTEGER NOT NULL,
  stripe_payment_intent_id TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- TEMPLATES
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  hook TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  soul_template TEXT NOT NULL,
  onboarding_questions JSONB NOT NULL,
  required_integrations JSONB NOT NULL,
  optional_integrations JSONB DEFAULT '[]',
  default_model TEXT DEFAULT 'claude-sonnet-4-5-20250929',
  estimated_daily_cost_cents INTEGER,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- INDEXES
CREATE INDEX idx_agents_user_id ON agents(user_id);
CREATE INDEX idx_usage_logs_agent_id ON usage_logs(agent_id);
CREATE INDEX idx_usage_logs_created ON usage_logs(created_at);
CREATE INDEX idx_activity_feed_agent ON activity_feed(agent_id);
CREATE INDEX idx_activity_feed_created ON activity_feed(created_at);
CREATE INDEX idx_credit_tx_user ON credit_transactions(user_id);

-- ROW LEVEL SECURITY
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_agents" ON agents FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_usage" ON usage_logs FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_activity" ON activity_feed FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_credits" ON credits FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_transactions" ON credit_transactions FOR ALL USING (user_id = auth.uid());
```

---

## 15. API Routes — Core Endpoints

```
/app/api/
├── auth/
│   └── webhook/route.ts          # Clerk → sync user to Supabase
├── billing/
│   ├── create-checkout/route.ts  # Create Stripe Checkout session
│   ├── webhook/route.ts          # Stripe webhook handler
│   └── recharge/route.ts         # Manual or auto credit recharge
├── agents/
│   ├── route.ts                  # GET (list), POST (create)
│   ├── [id]/route.ts             # GET, PATCH, DELETE
│   ├── [id]/pause/route.ts       # POST — pause container
│   ├── [id]/resume/route.ts      # POST — resume container
│   └── [id]/activity/route.ts    # GET — activity feed
├── templates/
│   └── route.ts                  # GET — list active templates
├── credits/
│   ├── route.ts                  # GET — balance + transactions
│   └── check/route.ts            # GET — quick check (for gateway)
├── onboarding/
│   ├── generate-soul/route.ts    # POST — template answers → SOUL.md
│   └── chat/route.ts             # POST — conversational onboarding
├── activity/
│   └── ask/route.ts              # POST — ask about activity
└── internal/
    ├── provision/route.ts        # POST — spin up Docker container
    ├── deprovision/route.ts      # POST — tear down container
    └── credit-callback/route.ts  # POST — LiteLLM cost callback
```

---

## 16. 7-Day Alpha Build Plan

### Day 0 — Prerequisites (Before Sprint)

```
□ Register domain
□ Create accounts: Clerk, Supabase, Stripe, Hetzner, Cloudflare
□ Set up Hetzner server with Docker
□ Install OpenClaw manually — confirm it runs
□ Get API keys: Anthropic, OpenAI (backup)
□ Git repo + Vercel project
```

### Day 1 — Foundation: Auth + DB + Landing

```
□ Init Next.js 15 + Tailwind + shadcn/ui
□ Clerk auth (signup, signin, user button)
□ Clerk webhook → Supabase user sync
□ Supabase schema migration (all tables)
□ Landing page (hero, template preview, pricing)
□ Deploy to Vercel
```

### Day 2 — Template Gallery + Onboarding

```
□ Seed templates table (top 5 fully configured, rest as stubs)
□ Template Gallery page (grid of cards)
□ Template Detail page
□ Dynamic onboarding form from template.onboarding_questions
□ SOUL.md generator endpoint
□ "Preview Your Agent" screen
```

### Day 3 — Stripe Billing + Credits

```
□ Stripe product: "The One Standard" ($29/mo)
□ Checkout flow → Stripe Checkout
□ Webhook handler (checkout, invoice, subscription events)
□ On payment: create subscription + add $10 starter credits
□ Credit balance display component
□ Auto-recharge logic (PaymentIntent on saved method)
□ Manual "Add Credits" button
```

### Day 4 — Container Orchestration (THE HARD DAY)

```
□ OpenClaw Docker base image with default config
□ Provision API: docker run with per-user network, volumes, env
□ Mount SOUL.md, configure LiteLLM endpoint
□ Deprovision API
□ Set up LiteLLM on server (master keys, virtual keys, callbacks)
□ Test full flow: create → provision → agent responds
□ Agent status polling
```

### Day 5 — Integrations

```
□ WhatsApp QR code flow
□ Slack OAuth flow
□ Gmail OAuth flow
□ Google Calendar (piggyback Gmail OAuth scope)
□ Telegram bot token flow
□ Store connection status in agent.integrations
```

### Day 6 — Dashboard + Kill-Switch

```
□ Activity Summary component (AI-generated via Haiku)
□ Activity Feed list (scrollable, time-ordered)
□ "Ask about activity" chat input
□ Kill-switch Layer 1: per-execution token limit
□ Kill-switch Layer 2: Redis rate limiter
□ Kill-switch Layer 3: pre-call credit check
□ Test $0 balance → agent pauses gracefully
□ "Agent Paused" state + "Add Credits" CTA
```

### Day 7 — Polish + Deploy

```
□ End-to-end test: signup → template → pay → live → activity
□ Critical bug fixes
□ Mobile responsiveness
□ Error and loading states
□ Remaining templates (aim for 10-20 total)
□ Helicone logging setup
□ Basic error alerting
□ Production deploy
□ Smoke test with 2-3 real users
```

---

## 17. MVP vs V2 Scope Boundaries

### ALPHA (Week 1)

- User auth (Clerk)
- Template gallery (10-20 templates)
- Template onboarding forms (Path A)
- SOUL.md generation
- Stripe checkout ($29/mo + $10 starter credits)
- Auto-recharge ($25 chunks)
- Docker container per user
- LiteLLM gateway with Claude Sonnet default
- WhatsApp (QR), Slack, Gmail, Calendar
- Activity Summary dashboard + feed
- 3-layer kill-switch
- Agent pause/resume

### BETA (Weeks 2-4)

- Conversational AI onboarding (Path B)
- "Ask about activity" Q&A
- Telegram + Discord
- Low-balance notifications (email/push)
- Stripe Customer Portal
- Agent editing post-creation
- Basic usage analytics
- Onboarding email drip
- SEO pages per template

### V2 (Month 2+)

- Model selection (advanced toggle)
- BYO-Key option
- Multi-agent per user
- iMessage (Mac infrastructure)
- Team/Org accounts
- Agent-to-agent handoff
- Custom domains
- White-label
- Referral program
- Public template marketplace
- Smart model routing (auto Haiku vs Sonnet)
- Firecracker microVM isolation
- SOC 2 compliance

---

## 18. Competitive Landscape Reference

### Direct Competitors (Turnkey with Credits)

| Provider | Price From | Credits | Weakness vs Us |
|---|---|---|---|
| StartClaw | $49/mo | $15 included | More expensive, less guided |
| DoneClaw | $39/mo | Included | Less established, less template depth |
| Operator.io | $15/mo | GPT-5.2 included | Less non-technical focused |
| ClawNest | $49/mo | Via OpenRouter | Most expensive, fewer integrations |
| xCloud | $24/mo | BYOK only | No credits, Telegram-only |

### Our Wedge

We're not competing with ChatGPT or Claude. We're converting the **inaction** of people who saw OpenClaw, thought "that's cool," but didn't want to deal with setup.

---

## 19. Open Questions & Risks

### Open Questions

| # | Question | Decision By |
|---|---|---|
| 1 | Final brand name + domain | Day 1 |
| 2 | Credit-to-token conversion ratio display | Day 3 |
| 3 | WhatsApp re-auth notification strategy | Day 5 |
| 4 | Which 5 templates fully built first | Day 2 |
| 5 | Refund policy for unused credits | Before public launch |
| 6 | Terms of Service / Privacy Policy | Before public launch |

### Key Risks

| Risk | Impact | Mitigation |
|---|---|---|
| OpenClaw updates break containers | High | Pin to specific version, test before updating |
| Runaway token costs | Critical | 3-layer kill-switch, conservative initial limits |
| WhatsApp sessions expire | Medium | Clear re-auth UX, proactive notifications |
| Single server failure | High | Daily backups, documented recovery, V2 multi-server |
| Stripe chargebacks from auto-recharge | Medium | Clear opt-in, pre-charge notification |
| OpenClaw security CVEs | High | Pin versions, monitor advisories, container isolation |
| User expects ChatGPT quality | Medium | Expectation setting, template-specific scope |

---

## Appendix A: SOUL.md Template Example

```markdown
# SOUL.md — Inbox Zero Agent for {{user_name}}

## Identity
You are {{user_name}}'s personal email management assistant.
Your name is "{{agent_name}}" and you communicate via {{primary_channel}}.

## Core Mission
Keep {{user_name}}'s inbox clean. Every morning at {{summary_time}},
send a summary of important emails and actions taken.

## Behavior Rules
1. Unsubscribe from: {{junk_categories}}
2. Archive promotional emails from unknown senders
3. Flag as important: emails from {{important_senders}}
4. Draft replies for emails needing response — send for approval first
5. Never delete — only archive or categorize
6. Never send without explicit approval

## Communication Style
- Concise, organized summaries with bullet points
- Lead with most important items
- Include sender name + subject for flagged emails
- End summaries with: "Anything you'd like me to handle?"

## Daily Routine
- {{summary_time}}: Scan emails, process, send summary
- Throughout day: Alert immediately for {{important_senders}}
- End of day: Recap of actions taken

## Tone
{{tone_preference}}
```

---

## Appendix B: Environment Variables

```bash
# Frontend (Vercel)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_STANDARD=price_...
STRIPE_PRICE_ID_CREDITS=price_...
NEXT_PUBLIC_APP_URL=https://gettheone.ai
HETZNER_SERVER_IP=xxx.xxx.xxx.xxx

# Hetzner Server
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
LITELLM_MASTER_KEY=sk-litellm-...
HELICONE_API_KEY=sk-hel-...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Per-User Container (injected at provision)
LITELLM_VIRTUAL_KEY=vk_{{user_id}}
LITELLM_BASE_URL=http://litellm:4000
OPENCLAW_AGENT_ID={{agent_id}}
```

---

**END OF SPECIFICATION**

*This document is the single source of truth for The One alpha build.
All decisions not covered here default to "simplest thing that works."
Ship fast. Learn from users. Iterate weekly.*
