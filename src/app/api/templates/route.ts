import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { templates as staticTemplates } from "@/lib/mock-data";

export async function GET() {
  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("templates")
      .select("*")
      .eq("is_active", true)
      .order("category");

    if (error) {
      console.error("Failed to fetch templates from database:", error);
      // Templates may not be in DB yet - use static templates
      return NextResponse.json(staticTemplates.filter((t) => t.is_active));
    }

    // If no templates in DB, use static templates
    if (!data || data.length === 0) {
      return NextResponse.json(staticTemplates.filter((t) => t.is_active));
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch templates:", error);
    // Fallback to static templates
    return NextResponse.json(staticTemplates.filter((t) => t.is_active));
  }
}
