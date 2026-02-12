"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Pause,
  Play,
  CheckCircle2,
  Circle,
  Trash2,
  Mail,
  Calendar,
  MessageSquare,
  Loader2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { templates as staticTemplates } from "@/lib/mock-data";

interface Agent {
  id: string;
  template_slug: string;
  display_name: string;
  soul_md: string;
  status: string;
  integrations: Record<string, { connected: boolean }>;
}

interface IntegrationStatus {
  gmail: { connected: boolean; email?: string };
  whatsapp: { connected: boolean; phone_number?: string; qr?: string };
  slack: { connected: boolean; configured: boolean; team?: string };
  telegram: { connected: boolean; bot_username?: string };
}

export default function SettingsPage() {
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [soulMd, setSoulMd] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [telegramToken, setTelegramToken] = useState("");
  const [connectingTelegram, setConnectingTelegram] = useState(false);
  const [integrations, setIntegrations] = useState<IntegrationStatus>({
    gmail: { connected: false },
    whatsapp: { connected: false },
    slack: { connected: false, configured: false },
    telegram: { connected: false },
  });
  const [checkingIntegrations, setCheckingIntegrations] = useState(true);

  const checkIntegrationStatus = useCallback(async () => {
    setCheckingIntegrations(true);
    try {
      const [gmailRes, whatsappRes, slackRes, telegramRes] = await Promise.all([
        fetch("/api/integrations/gmail/status"),
        fetch("/api/integrations/whatsapp/status"),
        fetch("/api/integrations/slack/status"),
        fetch("/api/integrations/telegram/status"),
      ]);

      const gmail = gmailRes.ok ? await gmailRes.json() : { connected: false };
      const whatsapp = whatsappRes.ok ? await whatsappRes.json() : { connected: false };
      const slack = slackRes.ok ? await slackRes.json() : { connected: false, configured: false };
      const telegram = telegramRes.ok ? await telegramRes.json() : { connected: false };

      setIntegrations({ gmail, whatsapp, slack, telegram });
    } catch (error) {
      console.error("Failed to check integrations:", error);
    } finally {
      setCheckingIntegrations(false);
    }
  }, []);

  useEffect(() => {
    async function fetchAgent() {
      try {
        const res = await fetch("/api/agents");
        if (res.ok) {
          const agents = await res.json();
          if (agents.length > 0) {
            setAgent(agents[0]);
            setDisplayName(agents[0].display_name);
            setSoulMd(agents[0].soul_md || "");
          }
        }
      } catch (error) {
        console.error("Failed to fetch agent:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAgent();
    checkIntegrationStatus();
  }, [checkIntegrationStatus]);

  const handleSave = async () => {
    if (!agent) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName, soul_md: soulMd }),
      });
      if (res.ok) {
        toast.success("Settings saved!");
      } else {
        throw new Error("Failed to save");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handlePauseResume = async () => {
    if (!agent) return;
    const endpoint = agent.status === "active" ? "pause" : "resume";
    try {
      const res = await fetch(`/api/agents/${agent.id}/${endpoint}`, {
        method: "POST",
      });
      if (res.ok) {
        const updated = await res.json();
        setAgent((prev) => prev ? { ...prev, status: updated.status } : null);
        toast.success(`Agent ${endpoint === "pause" ? "paused" : "resumed"}!`);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to update status");
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!agent) return;
    if (!confirm("Are you sure you want to delete this agent? This cannot be undone.")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Agent deleted");
        router.push("/dashboard");
      } else {
        throw new Error("Failed to delete");
      }
    } catch {
      toast.error("Failed to delete agent");
    } finally {
      setDeleting(false);
    }
  };

  const handleDisconnect = async (provider: string) => {
    try {
      const res = await fetch("/api/integrations/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (res.ok) {
        toast.success(`${provider} disconnected`);
        // Clear localStorage for Gmail
        if (provider === "gmail") {
          localStorage.removeItem("gmail_connected");
        }
        checkIntegrationStatus();
      } else {
        throw new Error("Failed to disconnect");
      }
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  const handleConnectGmail = () => {
    window.location.href = `/api/integrations/gmail/connect?template=settings&agent_id=${agent?.id || "new"}`;
  };

  const handleConnectSlack = () => {
    window.location.href = `/api/integrations/slack/connect?template=settings`;
  };

  const handleConnectTelegram = async () => {
    if (!telegramToken.trim()) {
      toast.error("Please enter a bot token");
      return;
    }
    setConnectingTelegram(true);
    try {
      const res = await fetch("/api/integrations/telegram/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_token: telegramToken, agent_id: agent?.id }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Connected to @${data.bot_username}`);
        setTelegramToken("");
        checkIntegrationStatus();
      } else {
        toast.error(data.error || "Failed to connect Telegram");
      }
    } catch {
      toast.error("Failed to connect Telegram");
    } finally {
      setConnectingTelegram(false);
    }
  };

  const template = staticTemplates.find((t) => t.slug === agent?.template_slug);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <header className="sticky top-0 z-50 border-b border-stone-200 bg-white">
          <div className="container mx-auto flex h-16 items-center px-4">
            <Skeleton className="h-6 w-32" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-10">
          <Skeleton className="h-96 rounded-2xl" />
        </main>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-stone-50">
        <main className="container mx-auto px-4 py-16 text-center">
          <p className="text-stone-600">No agent found. Create one first.</p>
          <Link href="/templates">
            <Button className="mt-4">Browse Templates</Button>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-stone-200 bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-stone-600 hover:text-stone-800 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back to Dashboard</span>
            </Link>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
        <div className="mx-auto max-w-2xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-stone-800">Agent Settings</h1>
            <p className="text-stone-600">Configure your AI agent</p>
          </div>

          {/* Agent Configuration */}
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-stone-800">Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-stone-700">Agent Name</Label>
                <Input
                  id="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1 rounded-xl border-stone-200"
                />
              </div>
              <div>
                <Label className="text-stone-700">Template</Label>
                <p className="mt-1 text-stone-600">{template?.name || agent.template_slug}</p>
              </div>
              <div>
                <Label className="text-stone-700">Status</Label>
                <div className="mt-2 flex items-center gap-3">
                  {agent.status === "active" ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      Active
                    </span>
                  ) : agent.status === "provisioning" ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                      <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                      Starting...
                    </span>
                  ) : agent.status === "failed" ? (
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePauseResume}
                    className="rounded-lg"
                    disabled={agent.status === "provisioning" || agent.status === "failed"}
                  >
                    {agent.status === "active" ? (
                      <>
                        <Pause className="mr-1 h-4 w-4" /> Pause Agent
                      </>
                    ) : (
                      <>
                        <Play className="mr-1 h-4 w-4" /> Resume Agent
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SOUL.md Editor */}
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-stone-800">Agent Instructions (SOUL.md)</CardTitle>
              <CardDescription>
                Edit how your agent behaves. Changes take effect immediately.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                value={soulMd}
                onChange={(e) => setSoulMd(e.target.value)}
                className="h-80 w-full rounded-xl border border-stone-200 p-4 font-mono text-sm focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-200"
              />
            </CardContent>
          </Card>

          {/* Integrations */}
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg text-stone-800">Integrations</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={checkIntegrationStatus}
                disabled={checkingIntegrations}
              >
                <RefreshCw className={`h-4 w-4 ${checkingIntegrations ? "animate-spin" : ""}`} />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {checkingIntegrations ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
                  <span className="ml-2 text-stone-600">Checking connections...</span>
                </div>
              ) : (
                <>
                  {/* Gmail & Calendar */}
                  <div className="rounded-xl border border-stone-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {integrations.gmail.connected ? (
                          <CheckCircle2 className="h-6 w-6 text-green-500" />
                        ) : (
                          <Circle className="h-6 w-6 text-stone-300" />
                        )}
                        <div className="flex items-center gap-2">
                          <Mail className="h-5 w-5 text-red-500" />
                          <Calendar className="h-5 w-5 text-blue-500" />
                          <div>
                            <p className="font-medium text-stone-800">Gmail & Calendar</p>
                            {integrations.gmail.connected && integrations.gmail.email ? (
                              <p className="text-sm text-green-600">Connected as {integrations.gmail.email}</p>
                            ) : (
                              <p className="text-sm text-stone-500">Connect your Google account</p>
                            )}
                          </div>
                        </div>
                      </div>
                      {integrations.gmail.connected ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDisconnect("gmail")}
                        >
                          Disconnect
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleConnectGmail}
                        >
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* WhatsApp */}
                  <div className="rounded-xl border border-stone-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {integrations.whatsapp.connected ? (
                          <CheckCircle2 className="h-6 w-6 text-green-500" />
                        ) : (
                          <Circle className="h-6 w-6 text-stone-300" />
                        )}
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-5 w-5 text-green-500" />
                          <div>
                            <p className="font-medium text-stone-800">WhatsApp</p>
                            {integrations.whatsapp.connected ? (
                              <p className="text-sm text-green-600">Connected to {integrations.whatsapp.phone_number}</p>
                            ) : (
                              <p className="text-sm text-stone-500">Scan QR code to connect</p>
                            )}
                          </div>
                        </div>
                      </div>
                      {integrations.whatsapp.connected ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDisconnect("whatsapp")}
                        >
                          Disconnect
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/dashboard/settings/whatsapp?agent_id=${agent.id}`)}
                        >
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Slack */}
                  <div className="rounded-xl border border-stone-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {integrations.slack.connected ? (
                          <CheckCircle2 className="h-6 w-6 text-green-500" />
                        ) : (
                          <Circle className="h-6 w-6 text-stone-300" />
                        )}
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-5 w-5 text-purple-500" />
                          <div>
                            <p className="font-medium text-stone-800">Slack</p>
                            {integrations.slack.connected ? (
                              <p className="text-sm text-green-600">Connected to {integrations.slack.team}</p>
                            ) : !integrations.slack.configured ? (
                              <p className="text-sm text-amber-600">
                                Add credentials in settings
                                <a
                                  href="https://api.slack.com/apps"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-1 inline-flex items-center text-violet-600 hover:underline"
                                >
                                  <ExternalLink className="h-3 w-3 ml-0.5" />
                                </a>
                              </p>
                            ) : (
                              <p className="text-sm text-stone-500">Connect your workspace</p>
                            )}
                          </div>
                        </div>
                      </div>
                      {integrations.slack.connected ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDisconnect("slack")}
                        >
                          Disconnect
                        </Button>
                      ) : integrations.slack.configured ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleConnectSlack}
                        >
                          Connect
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" disabled>
                          Setup Required
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Telegram */}
                  <div className="rounded-xl border border-stone-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {integrations.telegram.connected ? (
                          <CheckCircle2 className="h-6 w-6 text-green-500" />
                        ) : (
                          <Circle className="h-6 w-6 text-stone-300" />
                        )}
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-5 w-5 text-blue-400" />
                          <div>
                            <p className="font-medium text-stone-800">Telegram</p>
                            {integrations.telegram.connected ? (
                              <p className="text-sm text-green-600">Connected as {integrations.telegram.bot_username}</p>
                            ) : (
                              <p className="text-sm text-stone-500">Enter your bot token from @BotFather</p>
                            )}
                          </div>
                        </div>
                      </div>
                      {integrations.telegram.connected && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDisconnect("telegram")}
                        >
                          Disconnect
                        </Button>
                      )}
                    </div>
                    {!integrations.telegram.connected && (
                      <div className="flex gap-2 mt-2">
                        <Input
                          placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                          value={telegramToken}
                          onChange={(e) => setTelegramToken(e.target.value)}
                          className="rounded-lg text-sm"
                        />
                        <Button
                          onClick={handleConnectTelegram}
                          disabled={connectingTelegram || !telegramToken.trim()}
                          className="bg-violet-600 hover:bg-violet-700"
                        >
                          {connectingTelegram ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect"}
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Auto-Recharge */}
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-stone-800">Auto-Recharge</CardTitle>
              <CardDescription>
                When enabled, we&apos;ll automatically add $25 in credits when your balance drops below $5.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-stone-700">Auto-recharge enabled</span>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" defaultChecked className="peer sr-only" />
                  <div className="peer h-6 w-11 rounded-full bg-stone-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full"></div>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete Agent
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-violet-600 hover:bg-violet-700 rounded-xl"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
