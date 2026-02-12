# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**The One** is a turnkey managed hosting platform for OpenClaw AI agents. Target users are non-technical creative professionals who want AI automation without terminal access, API keys, or server management.

Core value prop: "Pick a template. Answer a few questions. Your agent starts working in 5 minutes."

See `SPEC.md` for the complete product specification.

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build (requires env vars)
npm run lint     # Run ESLint
npm run start    # Start production server
```

## Tech Stack

- **Framework**: Next.js 15 with App Router, TypeScript
- **Auth**: Clerk (`@clerk/nextjs`) - handles signup, login, sessions
- **Database**: Supabase (Postgres) with Row Level Security
- **Payments**: Stripe - $29/mo subscription + $25 credit auto-recharge
- **UI**: Tailwind CSS v4 + shadcn/ui
- **Deployment**: Vercel (frontend) + Hetzner (containers)
- **AI Gateway**: LiteLLM (self-hosted on Hetzner)

## Architecture

```
src/
├── app/
│   ├── (auth)/             # Public auth routes (Clerk components)
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── (dashboard)/        # Protected routes
│   │   └── dashboard/
│   ├── api/
│   │   └── webhooks/       # Stripe & Clerk webhooks
│   │       ├── stripe/
│   │       └── clerk/
│   ├── layout.tsx          # Root layout with ClerkProvider, TooltipProvider
│   └── page.tsx            # Landing page
├── components/ui/          # shadcn/ui components
├── lib/
│   ├── supabase/           # Database clients
│   │   ├── client.ts       # Browser client (anon key)
│   │   └── server.ts       # Server client (service role key)
│   ├── stripe/             # Payment clients
│   │   ├── client.ts       # Stripe.js loader
│   │   └── server.ts       # Stripe SDK instance
│   └── utils.ts            # cn() helper
├── hooks/
├── types/
│   └── database.ts         # Supabase generated types
└── middleware.ts           # Clerk auth protection
```

## API Routes Structure (from SPEC.md)

```
/api/
├── auth/webhook/           # Clerk → Supabase user sync
├── billing/
│   ├── create-checkout/    # Stripe Checkout session
│   ├── webhook/            # Stripe events
│   └── recharge/           # Credit recharge
├── agents/
│   ├── route.ts            # GET list, POST create
│   ├── [id]/               # GET, PATCH, DELETE
│   ├── [id]/pause/
│   ├── [id]/resume/
│   └── [id]/activity/
├── templates/              # GET active templates
├── credits/
│   ├── route.ts            # Balance + transactions
│   └── check/              # Quick check for gateway
├── onboarding/
│   ├── generate-soul/      # Template answers → SOUL.md
│   └── chat/               # Conversational onboarding
└── internal/
    ├── provision/          # Spin up Docker container
    ├── deprovision/        # Tear down container
    └── credit-callback/    # LiteLLM cost callback
```

## Database Schema

Core tables defined in SPEC.md Section 14:
- `users` - Synced from Clerk via webhook
- `subscriptions` - Stripe subscription state
- `credits` - Balance, auto-recharge settings
- `agents` - User agents with SOUL.md, container info
- `templates` - Onboarding templates with questions
- `usage_logs` - Token usage per request
- `activity_feed` - Agent actions for dashboard
- `credit_transactions` - Audit trail

All tables use Row Level Security. Generate types with: `npx supabase gen types typescript`

## Key Patterns

### Authentication
- Clerk middleware protects all routes except `/`, `/sign-in`, `/sign-up`, `/api/webhooks`
- Clerk webhook syncs user data to Supabase on signup

### Billing Flow
1. User completes Stripe Checkout ($29/mo)
2. Webhook creates subscription + adds $10 starter credits
3. At 20% remaining balance, auto-recharge $25 (if enabled)
4. Agent pauses at $0 balance

### Three-Layer Credit Kill-Switch
1. **Per-execution**: 80K token limit per agent run
2. **Per-hour**: 200K token rolling window per user
3. **Pre-call**: Balance check before every LLM API call

### Template System
Templates define: `soul_template` (with {{placeholders}}), `onboarding_questions`, `required_integrations`, `default_model`, `estimated_daily_credits`

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_STANDARD=     # $29/mo subscription
STRIPE_PRICE_ID_CREDITS=      # $25 credit product
```

## Adding shadcn/ui Components

```bash
npx shadcn@latest add [component-name]
```

## Model Routing (Default)

| Use Case | Model |
|----------|-------|
| Agent conversations | Claude Sonnet 4.5 |
| Activity summaries | Claude Haiku 4.5 |
| Simple responses | Claude Haiku 4.5 |
