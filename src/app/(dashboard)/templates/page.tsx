"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Mail,
  Sun,
  Search,
  PenTool,
  Home,
  Briefcase,
  BookOpen,
  Zap,
  ArrowRight,
  Sparkles,
  MessageSquare,
  Plus,
  Wand2,
} from "lucide-react";
import { templates as mockTemplates, categoryConfig, type Template, type Category } from "@/lib/mock-data";

const categories = [
  { key: "all", label: "All" },
  { key: "email", label: "Email" },
  { key: "daily-ops", label: "Daily Ops" },
  { key: "research", label: "Research" },
  { key: "content", label: "Content" },
  { key: "home", label: "Home & Personal" },
  { key: "business", label: "Business" },
  { key: "learning", label: "Learning" },
];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Mail,
  Sun,
  Search,
  PenTool,
  Home,
  Briefcase,
  BookOpen,
};

const categoryBgColors: Record<Category, string> = {
  email: "bg-purple-50 hover:bg-purple-100/80",
  "daily-ops": "bg-orange-50 hover:bg-orange-100/80",
  research: "bg-blue-50 hover:bg-blue-100/80",
  content: "bg-pink-50 hover:bg-pink-100/80",
  home: "bg-slate-50 hover:bg-slate-100/80",
  business: "bg-amber-50 hover:bg-amber-100/80",
  learning: "bg-green-50 hover:bg-green-100/80",
};

const categoryIconColors: Record<Category, string> = {
  email: "text-purple-600",
  "daily-ops": "text-orange-600",
  research: "text-blue-600",
  content: "text-pink-600",
  home: "text-slate-600",
  business: "text-amber-600",
  learning: "text-green-600",
};

export default function TemplatesPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const res = await fetch("/api/templates");
        if (res.ok) {
          const data = await res.json();
          setTemplates(data);
        } else {
          setTemplates(mockTemplates);
        }
      } catch {
        setTemplates(mockTemplates);
      } finally {
        setLoading(false);
      }
    }
    fetchTemplates();
  }, []);

  const filteredTemplates = templates.filter((template) => {
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.hook.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-stone-800">The One</span>
            </Link>
            <nav className="hidden items-center gap-4 md:flex">
              <Link href="/templates" className="text-sm font-medium text-stone-800">
                Templates
              </Link>
              <Link href="/dashboard" className="text-sm text-stone-600 hover:text-stone-800">
                Dashboard
              </Link>
            </nav>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
        {/* Page Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-stone-800 md:text-4xl">Template Gallery</h1>
          <p className="mt-3 text-lg text-stone-600">
            Find the perfect AI agent for your needs
          </p>
        </div>

        {/* Create Custom Agent Card */}
        <Link href="/templates/custom">
          <Card className="mb-8 border-2 border-dashed border-violet-300 bg-gradient-to-r from-violet-50 to-pink-50 rounded-2xl cursor-pointer transition-all hover:shadow-lg hover:border-violet-400 hover:-translate-y-0.5">
            <CardContent className="flex items-center gap-6 py-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 shadow-lg">
                <Plus className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-stone-800">Create Custom Agent</h3>
                <p className="text-stone-600">
                  Build your own AI agent from scratch — describe what you need in plain language
                </p>
              </div>
              <div className="hidden md:flex items-center gap-2 text-violet-600 font-medium">
                <Wand2 className="h-5 w-5" />
                Start Building
                <ArrowRight className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Search Bar */}
        <div className="mb-8 flex justify-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border-stone-200 py-6 pl-12 pr-4 text-base focus:border-violet-300 focus:ring-violet-200"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {categories.map((category) => (
            <button
              key={category.key}
              onClick={() => setSelectedCategory(category.key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                selectedCategory === category.key
                  ? "bg-violet-600 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>

        {/* Template Grid */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="rounded-2xl">
                <CardHeader>
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <Skeleton className="mt-4 h-6 w-3/4" />
                  <Skeleton className="mt-2 h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => {
                const Icon = iconMap[template.icon] || Mail;
                const bgColor = categoryBgColors[template.category as Category] || "bg-stone-50";
                const iconColor = categoryIconColors[template.category as Category] || "text-stone-600";
                const categoryLabel = categoryConfig[template.category as Category]?.label || template.category;

                return (
                  <Link key={template.slug} href={`/templates/${template.slug}`}>
                    <Card
                      className={`h-full cursor-pointer border-0 shadow-sm rounded-2xl transition-all hover:shadow-md hover:-translate-y-0.5 ${bgColor}`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
                            <Icon className={`h-6 w-6 ${iconColor}`} />
                          </div>
                          <div className="flex-1">
                            <span className="inline-block rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                              {categoryLabel}
                            </span>
                            <CardTitle className="mt-1 text-lg text-stone-800">{template.name}</CardTitle>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-base text-stone-600">
                          {template.hook}
                        </CardDescription>
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {template.required_integrations.map((integration) => (
                            <span
                              key={integration}
                              className="inline-block rounded-md bg-white/60 px-2 py-0.5 text-xs text-stone-500"
                            >
                              {integration}
                            </span>
                          ))}
                        </div>
                        <div className="mt-4 flex items-center text-sm font-medium text-violet-600">
                          Set up this agent
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>

            {filteredTemplates.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-stone-500">No templates found matching your criteria.</p>
                <Button
                  variant="link"
                  className="mt-2 text-violet-600"
                  onClick={() => {
                    setSelectedCategory("all");
                    setSearchQuery("");
                  }}
                >
                  Clear filters
                </Button>
              </div>
            )}
          </>
        )}

        {/* Bottom CTA */}
        <Card className="mt-12 border-2 border-dashed border-violet-200 bg-violet-50/50 rounded-2xl">
          <CardContent className="flex flex-col items-center justify-between gap-4 py-8 md:flex-row">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100">
                <Sparkles className="h-7 w-7 text-violet-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-stone-800">Not sure which agent you need?</h3>
                <p className="text-stone-600">
                  Let&apos;s figure it out together
                </p>
              </div>
            </div>
            <Button className="bg-violet-600 hover:bg-violet-700 rounded-xl px-6">
              <MessageSquare className="mr-2 h-4 w-4" />
              Chat with us
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
