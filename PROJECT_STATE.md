# Project State — The One

## Last Updated
2026-02-12 21:32 UTC

## Architecture
- **Frontend**: Next.js 15 (App Router), localhost:3000 dev, Vercel for production
- **Backend**: Hetzner server at 46.225.107.94
  - Orchestrator (Flask): port 5000
  - LiteLLM (AI Gateway): port 4000
  - WhatsApp Bridge (Node.js): port 3001
  - Redis: port 6379 (internal)
- **Database**: Supabase (PostgreSQL with RLS)
  - Tables: users, subscriptions, credits, templates, agents, usage_logs, activity_feed, credit_transactions, integration_tokens
- **Auth**: Clerk (configured, webhook syncs users to Supabase)

## What's Working
- [x] Landing page with responsive design
- [x] Clerk authentication (sign-in, sign-up, protected routes)
- [x] Template gallery (20 templates across 7 categories)
- [x] Template onboarding wizard (4 steps: Configure → Connect → Preview → Activate)
- [x] Custom agent wizard (/templates/custom)
- [x] Dashboard with agent status display
- [x] Dashboard settings with all integrations
- [x] Gmail OAuth flow (connect, callback, status)
- [x] Gmail token persistence in database
- [x] WhatsApp bridge deployed and generating QR codes
- [x] WhatsApp QR code display in settings
- [x] Telegram bot token validation flow
- [x] Slack OAuth flow (when credentials configured)
- [x] Calendar bundled with Gmail OAuth
- [x] LiteLLM AI responses working (agent-light model)
- [x] Orchestrator health checks
- [x] Agent provisioning API
- [x] SOUL.md generation via AI
- [x] API test suite (scripts/test-apis.sh)
- [x] All API routes compile (40 routes)

## What's Broken / In Progress
- [ ] Git push to GitHub (SSH key not added to account yet)
- [ ] Stripe webhooks (need STRIPE_WEBHOOK_SECRET configured in Stripe dashboard)
- [ ] Slack OAuth (SLACK_CLIENT_ID/SECRET not set - shows "Setup Required")
- [ ] Agent container actually running OpenClaw (currently placeholder python:slim)
- [ ] Real credit deduction from LiteLLM usage
- [ ] Activity feed population from running agents

## Environment Variables Set
```
CLERK_SECRET_KEY ✓
CLERK_WEBHOOK_SECRET ✓
GOOGLE_CLIENT_ID ✓
GOOGLE_CLIENT_SECRET ✓
NEXT_PUBLIC_APP_URL ✓
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ✓
NEXT_PUBLIC_CLERK_SIGN_IN_URL ✓
NEXT_PUBLIC_CLERK_SIGN_UP_URL ✓
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ✓
NEXT_PUBLIC_SUPABASE_ANON_KEY ✓
NEXT_PUBLIC_SUPABASE_URL ✓
ORCHESTRATOR_SECRET ✓
ORCHESTRATOR_URL ✓
STRIPE_SECRET_KEY ✓
STRIPE_WEBHOOK_SECRET ✓
SUPABASE_SERVICE_ROLE_KEY ✓
```

**Not Set:**
- SLACK_CLIENT_ID
- SLACK_CLIENT_SECRET
- LITELLM_API_KEY (uses orchestrator default)
- WHATSAPP_BRIDGE_URL (uses default 46.225.107.94:3001)

## File Structure
```
src/
├── app/
│   ├── (auth)/                    # Clerk auth pages
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── (dashboard)/               # Protected routes
│   │   ├── dashboard/
│   │   │   ├── page.tsx           # Main dashboard
│   │   │   ├── billing/           # Billing page
│   │   │   └── settings/          # Settings + integrations
│   │   │       └── whatsapp/      # WhatsApp QR scan page
│   │   └── templates/
│   │       ├── page.tsx           # Template gallery
│   │       ├── [slug]/            # Template wizard
│   │       └── custom/            # Custom agent wizard
│   ├── api/
│   │   ├── agents/                # Agent CRUD + pause/resume
│   │   ├── billing/               # Stripe checkout + webhooks
│   │   ├── credits/               # Balance + transactions
│   │   ├── integrations/          # Gmail, WhatsApp, Slack, Telegram
│   │   ├── internal/              # Provision, deprovision, credit-callback
│   │   ├── onboarding/            # generate-soul, generate-custom-soul
│   │   ├── templates/             # Template list
│   │   ├── activity/              # Ask about activity (AI)
│   │   └── auth/                  # Clerk webhook
│   ├── layout.tsx                 # Root layout with ClerkProvider
│   └── page.tsx                   # Landing page
├── components/ui/                 # shadcn/ui components
├── lib/
│   ├── mock-data.ts              # 20 template definitions
│   ├── supabase/                 # Database clients
│   └── stripe/                   # Payment clients
├── middleware.ts                  # Clerk route protection
└── types/database.ts             # Supabase types

server/
├── whatsapp/                      # WhatsApp bridge source
│   ├── index.js
│   ├── package.json
│   └── Dockerfile
└── deploy.sh                      # Deployment script

hetzner-setup/
└── orchestrator-app.py           # Flask orchestrator

supabase/
├── migrations/001_initial_schema.sql
└── seed.sql

scripts/
└── test-apis.sh                  # API test suite
```

## Integration Status

### Gmail & Calendar
- **Status**: Working
- **OAuth**: Google OAuth 2.0 with offline access
- **Scopes**: gmail.readonly, gmail.modify, gmail.send, calendar.readonly, calendar.events, userinfo.email
- **Token Storage**: `integration_tokens` table (user_id, provider='gmail', access_token, refresh_token, email)
- **Endpoints**: /api/integrations/gmail/connect, /callback, /status

### WhatsApp
- **Status**: Working
- **Bridge**: Node.js + whatsapp-web.js running on Hetzner port 3001
- **Sessions**: 3 active (persisted in /opt/theone/whatsapp-sessions)
- **QR Generation**: ~15 seconds (Chromium startup)
- **Token Storage**: `integration_tokens` table (user_id, provider='whatsapp', access_token=sessionId, email=phone)
- **Endpoints**: /api/integrations/whatsapp/qr, /status
- **Bridge Endpoints**: /health, /whatsapp/qr/:sessionId, /whatsapp/status/:sessionId, /whatsapp/send/:sessionId

### Slack
- **Status**: Not configured (missing credentials)
- **OAuth**: Slack OAuth v2 ready when SLACK_CLIENT_ID/SECRET set
- **Scopes**: channels:read, chat:write, users:read, users:read.email
- **Token Storage**: `integration_tokens` table (user_id, provider='slack')
- **UI**: Shows "Add credentials in settings" with link to api.slack.com/apps

### Telegram
- **Status**: Working
- **Flow**: User enters bot token, validated via Telegram getMe API
- **Token Storage**: `integration_tokens` table (user_id, provider='telegram', access_token=bot_token, email=@username)
- **Endpoints**: /api/integrations/telegram/connect (POST), /status

### Calendar
- **Status**: Working (bundled with Gmail)
- **Scopes**: Included in Gmail OAuth (calendar.readonly, calendar.events)
- **UI**: Shows as "Gmail & Calendar" with both icons

## Server Status

### Docker Containers (Hetzner 46.225.107.94)
| Container | Image | Port | Status |
|-----------|-------|------|--------|
| orchestrator | python:3.12 + Flask | 5000 | Running |
| litellm | litellm/litellm | 4000 | Running |
| whatsapp-bridge | theone/whatsapp-bridge | 3001 | Running |
| redis | redis:alpine | 6379 | Running |

### Exposed Endpoints
- `http://46.225.107.94:5000/health` - Orchestrator health
- `http://46.225.107.94:5000/api/agents/provision` - Provision agent (auth required)
- `http://46.225.107.94:5000/api/agents/<id>/pause` - Pause agent
- `http://46.225.107.94:5000/api/agents/<id>/resume` - Resume agent
- `http://46.225.107.94:5000/api/test-litellm` - Test AI (auth required)
- `http://46.225.107.94:4000/chat/completions` - LiteLLM API (auth required)
- `http://46.225.107.94:3001/health` - WhatsApp bridge health
- `http://46.225.107.94:3001/whatsapp/qr/:sessionId` - Get QR code
- `http://46.225.107.94:3001/whatsapp/status/:sessionId` - Check connection
- `http://46.225.107.94:3001/whatsapp/send/:sessionId` - Send message

## Git Status
- **Branch**: main
- **Commits**: 7
- **Remote**: git@github.com:bancier/startclaw-clone.git (not pushed yet)
- **Latest**: 76b44c1 - Add PROJECT_STATE.md for tracking project status
- **Build**: Compiles successfully (40 routes, no TypeScript errors)

## API Test Results (Last Run)
All 8 tests passing:
- Templates API returns 20 templates
- Gmail status endpoint
- WhatsApp status endpoint
- Slack status endpoint
- Telegram status endpoint
- Orchestrator health check
- LiteLLM integration
- WhatsApp bridge health check (3 active sessions)

## Setup Instructions

### Step 1: Add SSH Key to GitHub
1. Go to https://github.com/settings/keys
2. Click "New SSH key"
3. Paste this key:
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIkkiLHA0nbnqlnASEX9ymbzCo8/ShS/f7NvYdG3FqZK brandonancier@gmail.com
```
4. Run: `git push -u origin main`

### Step 2: Run Supabase Migrations
1. Go to https://supabase.com/dashboard/project/erhucjndgriwjckfifvf/sql
2. Click "New Query"
3. Paste entire contents of `supabase/migrations/001_initial_schema.sql`
4. Click "Run"
5. Then paste and run `supabase/seed.sql` to add 20 templates

### Step 3: Deploy to Vercel
1. Run: `vercel login`
2. Visit the URL shown and authorize
3. Run: `vercel --prod`
4. Add environment variables in Vercel dashboard (copy from .env.local)

### Step 4: Configure Slack (Optional)
1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name: "The One Agent", Workspace: Your workspace
4. OAuth & Permissions → Add scopes: channels:read, chat:write, users:read, users:read.email
5. Install App to Workspace
6. Copy Client ID and Client Secret to .env.local:
```
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret
```
7. Add OAuth Redirect URL: `https://your-vercel-domain.vercel.app/api/integrations/slack/callback`

## Remaining Work
- Replace placeholder agent container with actual OpenClaw image
- Implement real credit tracking from LiteLLM callbacks
- Add agent activity logging to populate activity_feed
- End-to-end testing with real integrations
