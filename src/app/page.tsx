import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "The One - Your AI Employee | Managed AI Agents",
  description: "The only AI employee you need. Pick a template, answer a few questions, and your AI agent starts working in 5 minutes. No API keys. No technical skills required.",
};
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Mail,
  Sun,
  Search,
  PenTool,
  Briefcase,
  BookOpen,
  LayoutTemplate,
  MessageSquare,
  Zap,
  Check,
  ChevronDown,
  Lock,
} from "lucide-react";

const templatePreviews = [
  {
    name: "Inbox Zero Agent",
    hook: "Clean up your email every morning",
    icon: Mail,
    category: "Email",
    bgColor: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  {
    name: "Morning Briefing",
    hook: "Start every day with a personalized summary",
    icon: Sun,
    category: "Daily Ops",
    bgColor: "bg-orange-50",
    iconColor: "text-orange-600",
  },
  {
    name: "Personal Research Assistant",
    hook: "Deep research on anything via chat",
    icon: Search,
    category: "Research",
    bgColor: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    name: "Content Ideas Generator",
    hook: "5 fresh ideas delivered every morning",
    icon: PenTool,
    category: "Content",
    bgColor: "bg-pink-50",
    iconColor: "text-pink-600",
  },
  {
    name: "Client Onboarding Assistant",
    hook: "Automate new client first 48 hours",
    icon: Briefcase,
    category: "Business",
    bgColor: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  {
    name: "Daily Learning Digest",
    hook: "Get smarter every day",
    icon: BookOpen,
    category: "Learning",
    bgColor: "bg-green-50",
    iconColor: "text-green-600",
  },
];

const faqs = [
  {
    question: "What exactly is The One?",
    answer: "The One is a managed hosting platform for AI agents. You pick a template, answer a few questions about your preferences, and we spin up a dedicated AI employee that works 24/7 on your behalf — handling email, scheduling, research, and more.",
  },
  {
    question: "Do I need any technical knowledge or API keys?",
    answer: "Not at all. We handle all the technical complexity. You never see a terminal, API key, or token dashboard. Just answer simple questions about how you want your agent to work, and we take care of the rest.",
  },
  {
    question: "How do credits work?",
    answer: "Credits power your agent's AI operations. Your $29/month subscription includes $10 in starter credits. When credits run low, we auto-recharge in $25 chunks (you can disable this). 1 credit = roughly 1 AI task like drafting an email or summarizing a document.",
  },
  {
    question: "What integrations are supported?",
    answer: "We support Gmail, Google Calendar, WhatsApp, and Slack. Connect with one click during setup — no API keys needed. More integrations coming soon.",
  },
  {
    question: "Can I cancel anytime?",
    answer: "Yes, cancel anytime from your dashboard. Your agent will continue working until the end of your billing period. Unused credits carry forward if you resubscribe within 30 days.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-stone-200">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-stone-800">The One</span>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/templates" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">
              Templates
            </Link>
            <Link href="#pricing" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">
              Pricing
            </Link>
            <Link href="#faq" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">
              FAQ
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm" className="text-stone-600 hover:text-stone-900">
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section with gradient and dot pattern */}
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-600/5 via-pink-500/5 to-transparent">
        {/* Dot pattern */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: "radial-gradient(circle, #7C3AED 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="container relative mx-auto px-4 py-24 text-center md:py-32">
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-stone-800 md:text-5xl lg:text-6xl">
            The only AI employee you need
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-stone-600 md:text-xl">
            Pick a template. Answer a few questions. Your agent starts working in 5 minutes.
          </p>
          <div className="mt-10">
            <Link href="/sign-up">
              <Button size="lg" className="bg-gradient-to-r from-violet-600 to-pink-500 hover:from-violet-700 hover:to-pink-600 text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
                Get Your AI Employee
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-stone-200 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold text-stone-800 md:text-4xl">How it works</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100">
                <LayoutTemplate className="h-7 w-7 text-violet-600" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-stone-800">Choose a Template</h3>
              <p className="mt-2 text-stone-600">
                Browse our gallery of ready-made AI agents for email, scheduling, research, and more.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100">
                <MessageSquare className="h-7 w-7 text-violet-600" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-stone-800">Answer a Few Questions</h3>
              <p className="mt-2 text-stone-600">
                Tell your agent about your preferences. No technical setup required.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100">
                <Zap className="h-7 w-7 text-violet-600" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-stone-800">Your Agent Gets to Work</h3>
              <p className="mt-2 text-stone-600">
                Your AI employee runs 24/7, handling tasks and reporting back to you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Template Preview */}
      <section className="border-t border-stone-200 bg-stone-50 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold text-stone-800 md:text-4xl">
            Ready-made agents for every need
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-stone-600">
            20+ templates across email, daily ops, research, content, business, and learning.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {templatePreviews.map((template) => (
              <Card
                key={template.name}
                className={`${template.bgColor} border-0 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer rounded-2xl`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm`}>
                      <template.icon className={`h-5 w-5 ${template.iconColor}`} />
                    </div>
                    <div>
                      <span className="inline-block rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                        {template.category}
                      </span>
                      <CardTitle className="mt-1 text-lg text-stone-800">{template.name}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base text-stone-600">
                    {template.hook}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link href="/templates">
              <Button variant="outline" size="lg" className="border-violet-200 text-violet-600 hover:bg-violet-50 rounded-xl">
                See all templates
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-stone-200 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold text-stone-800 md:text-4xl">
            Simple, transparent pricing
          </h2>
          <div className="mx-auto mt-12 max-w-md">
            <Card className="border-2 border-violet-200 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="text-center bg-gradient-to-br from-violet-50 to-pink-50 pb-8">
                <CardTitle className="text-xl text-stone-800">The One Standard</CardTitle>
                <div className="mt-4">
                  <span className="text-5xl font-bold text-stone-800">$29</span>
                  <span className="text-stone-600">/month</span>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-4">
                  {[
                    "Your own AI employee running 24/7",
                    "$10 in starter credits included",
                    "Auto-recharge credits when running low",
                    "Gmail, Calendar, WhatsApp, Slack integrations",
                    "We pick the best AI model automatically",
                    "Cancel anytime",
                  ].map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-stone-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/sign-up" className="mt-8 block">
                  <Button className="w-full bg-violet-600 hover:bg-violet-700 py-6 text-lg rounded-xl">
                    Get Started
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-stone-200 bg-stone-50 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold text-stone-800 md:text-4xl">
            Frequently asked questions
          </h2>
          <div className="mx-auto mt-12 max-w-2xl space-y-4">
            {faqs.map((faq, index) => (
              <details key={index} className="group rounded-2xl bg-white p-6 shadow-sm">
                <summary className="flex cursor-pointer items-center justify-between font-semibold text-stone-800 list-none">
                  {faq.question}
                  <ChevronDown className="h-5 w-5 text-stone-400 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-4 text-stone-600 leading-relaxed">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-stone-800">The One</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-stone-500">
              <Link href="/templates" className="hover:text-stone-800 transition-colors">Templates</Link>
              <Link href="#pricing" className="hover:text-stone-800 transition-colors">Pricing</Link>
              <Link href="#faq" className="hover:text-stone-800 transition-colors">FAQ</Link>
            </div>
            <div className="flex items-center gap-2 text-sm text-stone-400">
              <Lock className="h-3.5 w-3.5" />
              <span>Powered by OpenClaw</span>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-stone-400">
            &copy; {new Date().getFullYear()} The One. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
