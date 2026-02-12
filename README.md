# The One - Your AI Employee Platform

## Overview
The One is a turnkey managed hosting platform for OpenClaw AI agents. Non-technical users can pick a template, answer a few questions, and have a working AI agent in 5 minutes.

**Target users:** Non-technical creative professionals who want AI automation without terminal access, API keys, or server management.

**Core value prop:** "Pick a template. Answer a few questions. Your agent starts working in 5 minutes."

## Setup

1. Clone repo and run `npm install`

2. Copy `.env.example` to `.env.local` and fill in:

```bash
# Clerk (Authentication)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=    # from Clerk dashboard
CLERK_SECRET_KEY=                      # from Clerk dashboard
CLERK_WEBHOOK_SECRET=                  # create webhook in Clerk pointing to /api/auth/webhook

# Supabase (Database)
NEXT_PUBLIC_SUPABASE_URL=             # from Supabase project settings
NEXT_PUBLIC_SUPABASE_ANON_KEY=        # from Supabase API settings
SUPABASE_SERVICE_ROLE_KEY=            # from Supabase API settings

# Google OAuth (for Gmail/Calendar integrations)
GOOGLE_CLIENT_ID=                      # from Google Cloud Console OAuth client
GOOGLE_CLIENT_SECRET=                  # from Google Cloud Console OAuth client

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000  # change for production

# Stripe (currently mocked - leave blank)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Slack (optional)
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
```

3. Run `npm run dev`

4. (Optional) Set up Supabase database:
   - Paste `supabase/migrations/001_initial_schema.sql` into Supabase SQL editor to create tables
   - Paste `supabase/seed.sql` to populate templates

## What works now

### Pages
- **/** - Landing page with hero, template preview, pricing, FAQ
- **/sign-in** - Clerk sign-in page
- **/sign-up** - Clerk sign-up page
- **/templates** - Template gallery with 20 templates, search, category filtering
- **/templates/[slug]** - 4-step onboarding wizard (Configure, Connect, Preview, Activate)
- **/dashboard** - Agent status, credit balance, activity feed, "ask about activity"
- **/dashboard/settings** - Agent configuration, SOUL.md editor, integrations, pause/resume
- **/dashboard/billing** - Credit balance, transaction history, recharge

### API Routes
- `POST /api/auth/webhook` - Clerk webhook for user sync
- `GET /api/templates` - List all templates
- `POST /api/onboarding/generate-soul` - Generate SOUL.md from answers
- `GET|POST /api/agents` - List/create agents
- `GET|PATCH|DELETE /api/agents/[id]` - Get/update/delete agent
- `POST /api/agents/[id]/pause` - Pause agent
- `POST /api/agents/[id]/resume` - Resume agent
- `GET /api/agents/[id]/activity` - Get activity feed
- `GET /api/credits` - Get credit balance and transactions
- `POST /api/billing/create-checkout` - Create subscription (mocked)
- `POST /api/billing/recharge` - Add $25 credits (mocked)
- `POST /api/billing/webhook` - Stripe webhook (placeholder)
- `POST /api/activity/ask` - Ask questions about agent activity
- `GET /api/integrations/gmail/connect` - Start Gmail OAuth
- `GET /api/integrations/gmail/callback` - Gmail OAuth callback
- `GET /api/integrations/slack/connect` - Start Slack OAuth
- `GET /api/integrations/slack/callback` - Slack OAuth callback

### Features
- Full auth flow (sign up, sign in, protected routes)
- Template gallery with 20 templates across 7 categories
- Template onboarding wizard with dynamic questions
- Real Gmail/Calendar OAuth integration
- Agent creation (saves to Supabase with mock fallback)
- Dashboard with agent status and activity summary
- Credit system (mocked - no real charges)
- Mobile responsive design
- Toast notifications
- Loading skeletons

### Templates (20 total)
**Email (3):** Inbox Zero Agent, Email Draft Assistant, Follow-Up Tracker

**Daily Ops (3):** Morning Briefing, End-of-Day Wrap-Up, Meeting Prep Agent

**Research (4):** Personal Research Assistant, Restaurant Finder, Price Watch Agent, Competitor Watch

**Content (3):** Content Ideas Generator, Social Media Drafter, Trend Spotter

**Home & Personal (2):** Smart Home Controller, Family Coordinator

**Business (3):** Invoice Tracker, Client Onboarding Assistant, Appointment Setter

**Learning (2):** Daily Learning Digest, Habit Tracker

## What needs additional setup

### Stripe (Payments)
Currently mocked. When user clicks "Activate Agent":
- Skip payment
- Give $10 mock credits
- Create agent with status 'active'
- Redirect to dashboard

To enable real payments:
1. Add Stripe keys to `.env.local`
2. Update `/api/billing/create-checkout` to use Stripe Checkout
3. Implement `/api/billing/webhook` to handle Stripe events

### Hetzner (Container Runtime)
Container provisioning is mocked. Creating an agent:
- Saves to Supabase with status 'active'
- No Docker containers are actually created

To enable real containers:
1. Set up Hetzner server
2. Install Docker
3. Implement `/api/internal/provision` and `/api/internal/deprovision`
4. Set up LiteLLM gateway for AI model routing

### Slack Integration
OAuth flow is implemented but requires credentials:
1. Create Slack app at api.slack.com
2. Add `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` to `.env.local`
3. Configure OAuth redirect URL to `/api/integrations/slack/callback`

### WhatsApp Integration
Requires running OpenClaw instance to generate QR code:
- Currently shows "Coming soon" placeholder
- Needs OpenClaw container with WhatsApp Web connection

### AI Model Calls
Currently return mock responses. To enable real AI:
1. Set up LiteLLM gateway on Hetzner
2. Configure API keys for Claude models
3. Update agent execution to call LiteLLM

## Tech Stack

- **Framework:** Next.js 15 with App Router, TypeScript
- **Auth:** Clerk (`@clerk/nextjs`)
- **Database:** Supabase (Postgres) with Row Level Security
- **Payments:** Stripe (mocked)
- **UI:** Tailwind CSS v4 + shadcn/ui
- **Icons:** Lucide React
- **Notifications:** Sonner
- **OAuth:** googleapis (for Gmail/Calendar)

## Design System

- **Colors:** White/off-white backgrounds, violet (#7C3AED) primary, stone text colors
- **Cards:** White, shadow-sm, rounded-2xl, p-6, hover effects
- **Buttons:** Violet primary, rounded-xl, px-6 py-3
- **Inputs:** Large, rounded-xl, p-4, purple ring on focus
- **Typography:** Geist font, bold headings, generous line-height

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # Run ESLint
npm run start    # Start production server
```

## File Structure

```
src/
├── app/
│   ├── (auth)/           # Clerk auth pages
│   ├── (dashboard)/      # Protected dashboard pages
│   ├── api/              # API routes
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Landing page
├── components/ui/        # shadcn/ui components
├── lib/
│   ├── mock-data.ts      # 20 templates + mock data
│   ├── supabase/         # Database clients
│   ├── stripe/           # Payment clients
│   └── utils.ts          # Utilities
├── hooks/
├── types/
│   └── database.ts       # Supabase types
└── middleware.ts         # Clerk auth protection
```

## License

Proprietary - All rights reserved
