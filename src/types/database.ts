export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          clerk_id: string
          email: string
          first_name: string | null
          last_name: string | null
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clerk_id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clerk_id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          status: string
          plan: string
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status?: string
          plan?: string
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status?: string
          plan?: string
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      credits: {
        Row: {
          id: string
          user_id: string | null
          balance_cents: number
          auto_recharge_enabled: boolean
          auto_recharge_threshold_cents: number
          auto_recharge_amount_cents: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          balance_cents?: number
          auto_recharge_enabled?: boolean
          auto_recharge_threshold_cents?: number
          auto_recharge_amount_cents?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          balance_cents?: number
          auto_recharge_enabled?: boolean
          auto_recharge_threshold_cents?: number
          auto_recharge_amount_cents?: number
          created_at?: string
          updated_at?: string
        }
      }
      templates: {
        Row: {
          id: string
          slug: string
          name: string
          hook: string
          category: string
          icon: string
          required_integrations: string[]
          onboarding_questions: Json
          soul_template: string
          default_model: string
          estimated_daily_credits: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          hook: string
          category: string
          icon: string
          required_integrations?: string[]
          onboarding_questions?: Json
          soul_template: string
          default_model?: string
          estimated_daily_credits?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          hook?: string
          category?: string
          icon?: string
          required_integrations?: string[]
          onboarding_questions?: Json
          soul_template?: string
          default_model?: string
          estimated_daily_credits?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      agents: {
        Row: {
          id: string
          user_id: string | null
          template_slug: string | null
          display_name: string
          soul_md: string
          config: Json
          integrations: Json
          container_id: string | null
          container_url: string | null
          status: string
          error_message: string | null
          last_active_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          template_slug?: string | null
          display_name: string
          soul_md: string
          config?: Json
          integrations?: Json
          container_id?: string | null
          container_url?: string | null
          status?: string
          error_message?: string | null
          last_active_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          template_slug?: string | null
          display_name?: string
          soul_md?: string
          config?: Json
          integrations?: Json
          container_id?: string | null
          container_url?: string | null
          status?: string
          error_message?: string | null
          last_active_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      usage_logs: {
        Row: {
          id: string
          user_id: string | null
          agent_id: string | null
          model: string
          input_tokens: number
          output_tokens: number
          cost_cents: number
          request_type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          agent_id?: string | null
          model: string
          input_tokens?: number
          output_tokens?: number
          cost_cents?: number
          request_type?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          agent_id?: string | null
          model?: string
          input_tokens?: number
          output_tokens?: number
          cost_cents?: number
          request_type?: string | null
          created_at?: string
        }
      }
      activity_feed: {
        Row: {
          id: string
          agent_id: string | null
          user_id: string | null
          action: string
          details: Json
          created_at: string
        }
        Insert: {
          id?: string
          agent_id?: string | null
          user_id?: string | null
          action: string
          details?: Json
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string | null
          user_id?: string | null
          action?: string
          details?: Json
          created_at?: string
        }
      }
      credit_transactions: {
        Row: {
          id: string
          user_id: string | null
          amount_cents: number
          type: string
          description: string | null
          balance_after_cents: number
          stripe_payment_intent_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          amount_cents: number
          type: string
          description?: string | null
          balance_after_cents: number
          stripe_payment_intent_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          amount_cents?: number
          type?: string
          description?: string | null
          balance_after_cents?: number
          stripe_payment_intent_id?: string | null
          created_at?: string
        }
      }
      integration_tokens: {
        Row: {
          id: string
          user_id: string | null
          agent_id: string | null
          provider: string
          access_token: string
          refresh_token: string | null
          token_type: string | null
          scope: string | null
          expires_at: string | null
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          agent_id?: string | null
          provider: string
          access_token: string
          refresh_token?: string | null
          token_type?: string | null
          scope?: string | null
          expires_at?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          agent_id?: string | null
          provider?: string
          access_token?: string
          refresh_token?: string | null
          token_type?: string | null
          scope?: string | null
          expires_at?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Insertable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updatable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
