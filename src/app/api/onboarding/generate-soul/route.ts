import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTemplateBySlug } from "@/lib/mock-data";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { template_slug, answers } = await req.json();

    if (!template_slug || !answers) {
      return NextResponse.json({ error: "Missing template_slug or answers" }, { status: 400 });
    }

    // Try to get template from database first
    let template;
    try {
      const supabase = createServerClient();
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .eq("slug", template_slug)
        .single();

      if (!error && data) {
        template = data;
      }
    } catch {
      // Database lookup failed, will try static templates
    }

    // Fallback to static templates if not found in DB
    if (!template) {
      template = getTemplateBySlug(template_slug);
    }

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Replace placeholders in soul_template with answers
    let soulMd = template.soul_template;

    // Replace {{user_name}} with a generic value if not provided
    soulMd = soulMd.replace(/\{\{user_name\}\}/g, answers.user_name || "User");

    // Replace all other placeholders
    for (const [key, value] of Object.entries(answers)) {
      const placeholder = `{{${key}}}`;
      const regex = new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g");
      soulMd = soulMd.replace(regex, String(value));
    }

    return NextResponse.json({ soul_md: soulMd });
  } catch (error) {
    console.error("Failed to generate SOUL.md:", error);
    return NextResponse.json({ error: "Failed to generate SOUL.md" }, { status: 500 });
  }
}
