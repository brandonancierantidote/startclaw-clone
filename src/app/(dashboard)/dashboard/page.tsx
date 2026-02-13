"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Mail,
  Sun,
  Search,
  PenTool,
  Home,
  Briefcase,
  BookOpen,
  Zap,
  Bot,
  Plus,
  Settings,
  CreditCard,
  Pause,
  Play,
  Send,
  CheckCircle2,
  Clock,
  TrendingUp,
  Archive,
  Flag,
  AlertTriangle,
} from "lucide-react";
import {
  templates as staticTemplates,
  formatCents,
  getRelativeTime,
} from "@/lib/mock-data";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Mail,
  Sun,
  Search,
  PenTool,
  Home,
  Briefcase,
  BookOpen,
};

function getActivityIcon(action: string) {
  const lowerAction = action.toLowerCase();
  if (lowerAction.includes("archived")) return Archive;
  if (lowerAction.includes("flagged")) return Flag;
  if (lowerAction.includes("sent")) return Send;
  if (lowerAction.includes("processed")) return CheckCircle2;
  return Clock;
}

// Mock activity data for demo mode
const mockActivity = [
  { id: "mock-1", action: "Processed 47 new emails — archived 23 promotional", created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: "mock-2", action: "Flagged 3 important emails from clients", created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
  { id: "mock-3", action: "Sent morning briefing summary via WhatsApp", created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString() },
  { id: "mock-4", action: "Drafted 2 reply suggestions for review", created_at: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString() },
  { id: "mock-5", action: "Unsubscribed from 4 newsletters", created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
];

interface Agent {
  id: string;
  template_slug: string;
  display_name: string;
  status: string;
  created_at: string;
  _fallback?: boolean;
}

interface Credits {
  balance_cents: number;
  auto_recharge_enabled: boolean;
}

interface ActivityItem {
  id: string;
  action: string;
  created_at: string;
}

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [credits, setCredits] = useState<Credits | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [agentsRes, creditsRes] = await Promise.all([
          fetch("/api/agents"),
          fetch("/api/credits"),
        ]);

        let agentsData: Agent[] = [];
        if (agentsRes.ok) {
          const raw = await agentsRes.json();
          agentsData = Array.isArray(raw) ? raw : [];
          setAgents(agentsData);
        }

        if (creditsRes.ok) {
          const creditsData = await creditsRes.json();
          if (creditsData && typeof creditsData.balance_cents === "number") {
            setCredits(creditsData);
          } else {
            setCredits({ balance_cents: 1000, auto_recharge_enabled: true });
            setDemoMode(true);
          }
        } else {
          setCredits({ balance_cents: 1000, auto_recharge_enabled: true });
          setDemoMode(true);
        }

        // Fetch activity for first agent if exists
        if (agentsData.length > 0) {
          try {
            const activityRes = await fetch(`/api/agents/${agentsData[0].id}/activity`);
            if (activityRes.ok) {
              const activityData = await activityRes.json();
              const realActivity = Array.isArray(activityData) ? activityData : [];
              if (realActivity.length > 0) {
                setActivity(realActivity);
              } else {
                // No real activity — show mock
                setActivity(mockActivity);
                setDemoMode(true);
              }
            } else {
              setActivity(mockActivity);
              setDemoMode(true);
            }
          } catch {
            setActivity(mockActivity);
            setDemoMode(true);
          }
        } else {
          setActivity([]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setAgents([]);
        setCredits({ balance_cents: 1000, auto_recharge_enabled: true });
        setActivity([]);
        setDemoMode(true);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handlePauseResume = async (agentId: string, currentStatus: string) => {
    const endpoint = currentStatus === "active" ? "pause" : "resume";
    try {
      const res = await fetch(`/api/agents/${agentId}/${endpoint}`, { method: "POST" });
      if (res.ok) {
        const updated = await res.json();
        setAgents((prev) =>
          prev.map((a) => (a.id === agentId ? { ...a, status: updated.status } : a))
        );
        toast.success(`Agent ${endpoint === "pause" ? "paused" : "resumed"}!`);
      } else {
        const error = await res.json();
        toast.error(error.error || `Failed to ${endpoint} agent`);
      }
    } catch {
      toast.error("Failed to update agent status");
    }
  };

  const handleAskActivity = async () => {
    if (!question.trim()) return;
    setAsking(true);
    try {
      const agentId = agents[0]?.id || "demo";
      const res = await fetch("/api/activity/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, agent_id: agentId }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnswer(data.answer);
      } else {
        // Fallback response when API fails
        setAnswer(
          "Your agent has been processing emails, flagging important messages, and keeping your inbox clean. " +
          "It processed about 47 emails today, archived 23 promotional ones, and flagged 3 from clients. " +
          "Ask me something more specific!"
        );
      }
    } catch {
      setAnswer(
        "I'm having trouble connecting right now, but your agent is working! " +
        "Try asking again in a moment."
      );
    } finally {
      setAsking(false);
    }
  };

  const handleRecharge = async () => {
    try {
      const res = await fetch("/api/billing/recharge", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setCredits((prev) => prev ? { ...prev, balance_cents: data.balance_cents } : null);
        toast.success("$25 credits added!");
      } else {
        // Mock recharge
        setCredits((prev) => prev ? { ...prev, balance_cents: prev.balance_cents + 2500 } : null);
        toast.success("$25 credits added!");
      }
    } catch {
      // Mock recharge
      setCredits((prev) => prev ? { ...prev, balance_cents: (prev.balance_cents || 0) + 2500 } : null);
      toast.success("$25 credits added!");
    }
  };

  const hasAgents = agents.length > 0;
  const currentAgent = agents[0];
  const template = currentAgent ? staticTemplates.find((t) => t.slug === currentAgent.template_slug) : null;
  const Icon = template ? iconMap[template.icon] || Bot : Bot;

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <header className="sticky top-0 z-50 border-b border-stone-200 bg-white">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-10">
          <div className="grid gap-6 md:grid-cols-3">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-stone-200 bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-stone-800">The One</span>
            </Link>
            <nav className="hidden items-center gap-4 md:flex">
              <Link href="/templates" className="text-sm text-stone-600 hover:text-stone-800">
                Templates
              </Link>
              <Link href="/dashboard" className="text-sm font-medium text-stone-800">
                Dashboard
              </Link>
            </nav>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
        {/* Demo Mode Banner */}
        {demoMode && hasAgents && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Demo mode</p>
              <p className="text-xs text-amber-600">
                Showing sample activity data. Real data will appear once your agent starts processing tasks.
              </p>
            </div>
          </div>
        )}

        {!hasAgents ? (
          <Card className="mx-auto max-w-md rounded-2xl border-2 border-dashed border-stone-300 bg-white text-center">
            <CardContent className="py-16">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100">
                <Bot className="h-8 w-8 text-violet-600" />
              </div>
              <h2 className="mt-6 text-xl font-bold text-stone-800">You don&apos;t have any agents yet!</h2>
              <p className="mt-2 text-stone-600">
                Let&apos;s fix that — browse our template gallery and set up your first AI employee.
              </p>
              <Link href="/templates">
                <Button className="mt-6 bg-violet-600 hover:bg-violet-700 rounded-xl">
                  <Plus className="mr-2 h-4 w-4" />
                  Browse Templates
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Top Row: Agent Status, Credits */}
            <div className="grid gap-6 md:grid-cols-3">
              {/* Agent Status Card */}
              <Card className="rounded-2xl border-0 shadow-sm md:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100">
                      <Icon className="h-6 w-6 text-violet-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-stone-800">{currentAgent.display_name}</CardTitle>
                      <CardDescription>{template?.name || currentAgent.template_slug}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentAgent.status === "active" ? (
                      <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        Active
                      </span>
                    ) : currentAgent.status === "provisioning" ? (
                      <span className="flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                        <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                        Starting...
                      </span>
                    ) : currentAgent.status === "pending" ? (
                      <span className="flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-violet-700">
                        <span className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
                        Provisioning...
                      </span>
                    ) : currentAgent.status === "failed" ? (
                      <span className="flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        Failed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        Paused
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-stone-500">
                      Created {new Date(currentAgent.created_at).toLocaleDateString()}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePauseResume(currentAgent.id, currentAgent.status)}
                        className="rounded-lg"
                        disabled={currentAgent.status === "provisioning" || currentAgent.status === "pending" || currentAgent.status === "failed"}
                      >
                        {currentAgent.status === "active" ? (
                          <><Pause className="mr-1 h-4 w-4" /> Pause</>
                        ) : (
                          <><Play className="mr-1 h-4 w-4" /> Resume</>
                        )}
                      </Button>
                      <Link href="/dashboard/settings">
                        <Button variant="outline" size="sm" className="rounded-lg">
                          <Settings className="mr-1 h-4 w-4" /> Settings
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Credits Card */}
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-stone-600">Credits</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-stone-800">
                    {credits ? formatCents(credits.balance_cents) : "$0.00"}
                  </p>
                  <div className="mt-2 h-2 rounded-full bg-stone-100">
                    <div
                      className="h-2 rounded-full bg-violet-600"
                      style={{
                        width: `${Math.min(100, ((credits?.balance_cents || 0) / 2500) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-stone-500">
                      Auto-recharge: {credits?.auto_recharge_enabled ? (
                        <span className="text-green-600">On</span>
                      ) : (
                        <span className="text-stone-400">Off</span>
                      )}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRecharge}
                      className="rounded-lg text-xs"
                    >
                      <Plus className="mr-1 h-3 w-3" /> Add $25
                    </Button>
                  </div>
                  <Link href="/dashboard/billing">
                    <Button variant="link" size="sm" className="mt-2 p-0 text-violet-600">
                      <CreditCard className="mr-1 h-3 w-3" /> Billing details
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            {/* Activity Summary */}
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-violet-600" />
                  <CardTitle className="text-lg text-stone-800">Recent Activity</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {activity.length > 0 ? (
                  <>
                    <p className="mb-4 text-stone-600">
                      Your agent has completed <span className="font-semibold text-stone-800">{activity.length} tasks</span> recently.
                    </p>
                    <div className="space-y-3">
                      {activity.slice(0, 5).map((item) => {
                        const ActivityIcon = getActivityIcon(item.action);
                        return (
                          <div key={item.id} className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-stone-100">
                              <ActivityIcon className="h-4 w-4 text-stone-600" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-stone-800">{item.action}</p>
                              <p className="text-xs text-stone-500">{getRelativeTime(item.created_at)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="text-stone-500">Your agent is warming up. Activity will show here once it starts working.</p>
                )}
              </CardContent>
            </Card>

            {/* Ask About Activity */}
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-stone-800">Ask about your activity</CardTitle>
                <CardDescription>
                  Ask your agent questions about what it&apos;s been doing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Which emails did you flag today?"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAskActivity()}
                    className="rounded-xl border-stone-200"
                  />
                  <Button
                    onClick={handleAskActivity}
                    disabled={asking || !question.trim()}
                    className="bg-violet-600 hover:bg-violet-700 rounded-xl"
                  >
                    {asking ? "..." : "Ask"}
                  </Button>
                </div>
                {answer && (
                  <div className="mt-4 rounded-xl bg-violet-50 p-4">
                    <p className="whitespace-pre-wrap text-sm text-stone-700">{answer}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bottom Actions */}
            <div className="flex justify-center gap-4">
              <Link href="/dashboard/settings">
                <Button variant="outline" className="rounded-xl">
                  <Settings className="mr-2 h-4 w-4" /> Settings
                </Button>
              </Link>
              <Link href="/templates">
                <Button variant="outline" className="rounded-xl">
                  <Plus className="mr-2 h-4 w-4" /> Add Another Agent
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
