-- =========================================
-- THE ONE - Initial Database Schema
-- =========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================
-- USERS TABLE
-- Synced from Clerk via webhook
-- =========================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_users_email ON users(email);

-- =========================================
-- SUBSCRIPTIONS TABLE
-- Stripe subscription state
-- =========================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'inactive', -- active, cancelled, past_due, inactive
  plan TEXT NOT NULL DEFAULT 'standard',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);

-- =========================================
-- CREDITS TABLE
-- User credit balance and auto-recharge settings
-- =========================================
CREATE TABLE credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  balance_cents INTEGER NOT NULL DEFAULT 0,
  auto_recharge_enabled BOOLEAN DEFAULT TRUE,
  auto_recharge_threshold_cents INTEGER DEFAULT 500,
  auto_recharge_amount_cents INTEGER DEFAULT 2500,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credits_user_id ON credits(user_id);

-- =========================================
-- TEMPLATES TABLE
-- Agent templates with onboarding questions
-- =========================================
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  hook TEXT NOT NULL,
  category TEXT NOT NULL,
  icon TEXT NOT NULL,
  required_integrations TEXT[] NOT NULL DEFAULT '{}',
  onboarding_questions JSONB NOT NULL DEFAULT '[]',
  soul_template TEXT NOT NULL,
  default_model TEXT NOT NULL DEFAULT 'claude-sonnet-4-5-20250514',
  estimated_daily_credits INTEGER NOT NULL DEFAULT 50,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_templates_slug ON templates(slug);
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_is_active ON templates(is_active);

-- =========================================
-- AGENTS TABLE
-- User agents with SOUL.md and container info
-- =========================================
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  template_slug TEXT REFERENCES templates(slug),
  display_name TEXT NOT NULL,
  soul_md TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  integrations JSONB NOT NULL DEFAULT '{}',
  container_id TEXT,
  container_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, paused, error
  error_message TEXT,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agents_user_id ON agents(user_id);
CREATE INDEX idx_agents_template_slug ON agents(template_slug);
CREATE INDEX idx_agents_status ON agents(status);

-- =========================================
-- USAGE_LOGS TABLE
-- Token usage per request
-- =========================================
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_cents INTEGER NOT NULL DEFAULT 0,
  request_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_agent_id ON usage_logs(agent_id);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at);

-- =========================================
-- ACTIVITY_FEED TABLE
-- Agent actions for dashboard
-- =========================================
CREATE TABLE activity_feed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_feed_agent_id ON activity_feed(agent_id);
CREATE INDEX idx_activity_feed_user_id ON activity_feed(user_id);
CREATE INDEX idx_activity_feed_created_at ON activity_feed(created_at);

-- =========================================
-- CREDIT_TRANSACTIONS TABLE
-- Audit trail for credits
-- =========================================
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  type TEXT NOT NULL, -- credit, debit
  description TEXT,
  balance_after_cents INTEGER NOT NULL,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(type);

-- =========================================
-- INTEGRATION_TOKENS TABLE
-- OAuth tokens for integrations
-- =========================================
CREATE TABLE integration_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  provider TEXT NOT NULL, -- gmail, slack, calendar
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT,
  scope TEXT,
  expires_at TIMESTAMPTZ,
  email TEXT, -- for email-based integrations
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_integration_tokens_user_id ON integration_tokens(user_id);
CREATE INDEX idx_integration_tokens_agent_id ON integration_tokens(agent_id);
CREATE INDEX idx_integration_tokens_provider ON integration_tokens(provider);
CREATE UNIQUE INDEX idx_integration_tokens_user_provider ON integration_tokens(user_id, provider);

-- =========================================
-- ROW LEVEL SECURITY POLICIES
-- =========================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_tokens ENABLE ROW LEVEL SECURITY;

-- Users: users can only read their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid()::text = clerk_id);

CREATE POLICY "Service role full access to users" ON users
  FOR ALL USING (auth.role() = 'service_role');

-- Subscriptions: users can only view their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
  );

CREATE POLICY "Service role full access to subscriptions" ON subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- Credits: users can only view their own credits
CREATE POLICY "Users can view own credits" ON credits
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
  );

CREATE POLICY "Service role full access to credits" ON credits
  FOR ALL USING (auth.role() = 'service_role');

-- Templates: everyone can read active templates
CREATE POLICY "Anyone can view active templates" ON templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Service role full access to templates" ON templates
  FOR ALL USING (auth.role() = 'service_role');

-- Agents: users can only manage their own agents
CREATE POLICY "Users can view own agents" ON agents
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
  );

CREATE POLICY "Users can update own agents" ON agents
  FOR UPDATE USING (
    user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
  );

CREATE POLICY "Service role full access to agents" ON agents
  FOR ALL USING (auth.role() = 'service_role');

-- Usage logs: users can only view their own usage
CREATE POLICY "Users can view own usage logs" ON usage_logs
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
  );

CREATE POLICY "Service role full access to usage_logs" ON usage_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Activity feed: users can only view their own activity
CREATE POLICY "Users can view own activity" ON activity_feed
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
  );

CREATE POLICY "Service role full access to activity_feed" ON activity_feed
  FOR ALL USING (auth.role() = 'service_role');

-- Credit transactions: users can only view their own transactions
CREATE POLICY "Users can view own credit transactions" ON credit_transactions
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
  );

CREATE POLICY "Service role full access to credit_transactions" ON credit_transactions
  FOR ALL USING (auth.role() = 'service_role');

-- Integration tokens: users can only manage their own tokens
CREATE POLICY "Users can view own integration tokens" ON integration_tokens
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
  );

CREATE POLICY "Users can update own integration tokens" ON integration_tokens
  FOR UPDATE USING (
    user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
  );

CREATE POLICY "Service role full access to integration_tokens" ON integration_tokens
  FOR ALL USING (auth.role() = 'service_role');

-- =========================================
-- FUNCTIONS
-- =========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credits_updated_at BEFORE UPDATE ON credits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integration_tokens_updated_at BEFORE UPDATE ON integration_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
