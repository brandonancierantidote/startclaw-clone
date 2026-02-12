import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Use a simpler client without strict typing to avoid issues with complex queries
// In production, you'd use proper generated types from `npx supabase gen types typescript`
export function createServerClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
}
