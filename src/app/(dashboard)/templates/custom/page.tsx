"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Zap,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Sparkles,
  Lock,
  Loader2,
  MessageSquare,
  Mail,
  Calendar,
  Wand2,
} from "lucide-react";
import { formatCents } from "@/lib/mock-data";

const steps = ["Describe", "Connect", "Preview", "Activate"];

interface GmailStatus {
  connected: boolean;
  email?: string;
}

interface SlackStatus {
  connected: boolean;
  configured?: boolean;
  team?: string;
}

interface TelegramStatus {
  connected: boolean;
  bot_username?: string;
  bot_name?: string;
}

export default function CustomAgentWizardPage() {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(0);
  const [agentName, setAgentName] = useState("");
  const [agentDescription, setAgentDescription] = useState("");
  const [preferredChannel, setPreferredChannel] = useState("whatsapp");
  const [connectedIntegrations, setConnectedIntegrations] = useState<string[]>([]);
  const [generatedSoul, setGeneratedSoul] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [gmailStatus, setGmailStatus] = useState<GmailStatus>({ connected: false });
  const [slackStatus, setSlackStatus] = useState<SlackStatus>({ connected: false });
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus>({ connected: false });
  const [checkingIntegrations, setCheckingIntegrations] = useState(true);

  // Integration form states
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [slackWebhook, setSlackWebhook] = useState("");
  const [telegramToken, setTelegramToken] = useState("");
  const [connectingWhatsapp, setConnectingWhatsapp] = useState(false);
  const [connectingSlack, setConnectingSlack] = useState(false);
  const [connectingTelegram, setConnectingTelegram] = useState(false);
  const [showWhatsappForm, setShowWhatsappForm] = useState(false);
  const [showSlackForm, setShowSlackForm] = useState(false);
  const [showTelegramForm, setShowTelegramForm] = useState(false);

  const STORAGE_KEY = "custom_onboarding_state";
  const GMAIL_STORAGE_KEY = "gmail_connected";

  const checkIntegrationStatus = useCallback(async () => {
    setCheckingIntegrations(true);
    try {
      const gmailRes = await fetch("/api/integrations/gmail/status");
      if (gmailRes.ok) {
        const data = await gmailRes.json();
        setGmailStatus(data);
        if (data.connected) {
          localStorage.setItem(GMAIL_STORAGE_KEY, JSON.stringify({ connected: true, email: data.email }));
          setConnectedIntegrations(prev => {
            if (!prev.includes("gmail")) return [...prev, "gmail"];
            return prev;
          });
        }
      }

      const slackRes = await fetch("/api/integrations/slack/status");
      if (slackRes.ok) {
        const data = await slackRes.json();
        setSlackStatus(data);
        if (data.connected) {
          setConnectedIntegrations(prev => {
            if (!prev.includes("slack")) return [...prev, "slack"];
            return prev;
          });
        }
      }

      const telegramRes = await fetch("/api/integrations/telegram/status");
      if (telegramRes.ok) {
        const data = await telegramRes.json();
        setTelegramStatus(data);
        if (data.connected) {
          setConnectedIntegrations(prev => {
            if (!prev.includes("telegram")) return [...prev, "telegram"];
            return prev;
          });
        }
      }
    } catch (error) {
      console.error("Failed to check integrations:", error);
    } finally {
      setCheckingIntegrations(false);
    }
  }, []);

  useEffect(() => {
    checkIntegrationStatus();

    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.agentName) setAgentName(parsed.agentName);
        if (parsed.agentDescription) setAgentDescription(parsed.agentDescription);
        if (parsed.preferredChannel) setPreferredChannel(parsed.preferredChannel);
        if (parsed.connectedIntegrations) setConnectedIntegrations(parsed.connectedIntegrations);
      } catch {}
    }
  }, [checkIntegrationStatus]);

  const handleConnectGmail = () => {
    const stateToSave = { agentName, agentDescription, preferredChannel, connectedIntegrations };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    window.location.href = `/api/integrations/gmail/connect?template=custom&agent_id=new`;
  };

  const handleConnectSlack = () => {
    if (slackStatus.configured !== false) {
      const stateToSave = { agentName, agentDescription, preferredChannel, connectedIntegrations };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      window.location.href = `/api/integrations/slack/connect?template=custom`;
    } else {
      setShowSlackForm(true);
    }
  };

  const handleSaveSlackWebhook = async () => {
    if (!slackWebhook.trim()) return;
    setConnectingSlack(true);
    try {
      const res = await fetch("/api/integrations/slack/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhook_url: slackWebhook }),
      });
      if (res.ok) {
        setSlackStatus({ connected: true, team: "Manual" });
      }
    } catch {}
    setConnectedIntegrations(prev => {
      if (!prev.includes("slack")) return [...prev, "slack"];
      return prev;
    });
    setShowSlackForm(false);
    toast.success("Slack webhook saved!");
    setConnectingSlack(false);
  };

  const handleConnectWhatsApp = () => {
    setShowWhatsappForm(true);
  };

  const handleSaveWhatsAppPhone = async () => {
    if (!whatsappPhone.trim()) return;
    setConnectingWhatsapp(true);
    try {
      const res = await fetch(`/api/integrations/whatsapp/connect?agent_id=new&template=custom`);
      if (res.ok) {
        setConnectedIntegrations(prev => {
          if (!prev.includes("whatsapp")) return [...prev, "whatsapp"];
          return prev;
        });
        setShowWhatsappForm(false);
        toast.success("WhatsApp connection initiated!");
        setConnectingWhatsapp(false);
        return;
      }
    } catch {}
    setConnectedIntegrations(prev => {
      if (!prev.includes("whatsapp")) return [...prev, "whatsapp"];
      return prev;
    });
    setShowWhatsappForm(false);
    toast.success("WhatsApp phone saved! We'll send a connection link when your agent is ready.");
    setConnectingWhatsapp(false);
  };

  const handleConnectTelegram = async () => {
    if (!telegramToken.trim()) return;
    setConnectingTelegram(true);
    try {
      const res = await fetch("/api/integrations/telegram/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_token: telegramToken }),
      });
      const data = await res.json();
      if (res.ok && data.connected) {
        setTelegramStatus({ connected: true, bot_username: data.bot_username, bot_name: data.bot_name });
        setConnectedIntegrations(prev => {
          if (!prev.includes("telegram")) return [...prev, "telegram"];
          return prev;
        });
        setShowTelegramForm(false);
        toast.success(`Telegram bot @${data.bot_username} connected!`);
      } else {
        toast.error(data.error || "Failed to connect Telegram bot");
      }
    } catch {
      toast.error("Failed to connect Telegram. Check your bot token.");
    } finally {
      setConnectingTelegram(false);
    }
  };

  const generateSoulWithAI = async () => {
    if (!agentDescription.trim()) {
      toast.error("Please describe what you want your agent to do");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/onboarding/generate-custom-soul", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: agentDescription,
          agent_name: agentName || "My Custom Agent",
          preferred_channel: preferredChannel,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedSoul(data.soul_md);
      } else {
        throw new Error("Failed to generate");
      }
    } catch (error) {
      console.error("Failed to generate SOUL:", error);
      toast.error("Failed to generate agent instructions. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (currentStep === 2 && !generatedSoul && agentDescription) {
      generateSoulWithAI();
    }
  }, [currentStep]);

  const handleActivate = async () => {
    if (!generatedSoul) {
      toast.error("Please generate agent instructions first");
      return;
    }

    setIsActivating(true);
    try {
      const agentRes = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_slug: "custom",
          display_name: agentName || "My Custom Agent",
          soul_md: generatedSoul,
          config: {
            description: agentDescription,
            preferred_channel: preferredChannel,
          },
          integrations: connectedIntegrations.reduce((acc, i) => {
            const details: Record<string, unknown> = { connected: true };
            if (i === "whatsapp" && whatsappPhone) details.phone_number = whatsappPhone;
            if (i === "slack" && slackWebhook) details.webhook_url = slackWebhook;
            if (i === "telegram" && telegramStatus.bot_username) details.bot_username = telegramStatus.bot_username;
            return { ...acc, [i]: details };
          }, {}),
        }),
      });

      if (agentRes.ok) {
        const agentData = await agentRes.json();
        localStorage.removeItem(STORAGE_KEY);
        toast.success(agentData.message || "Agent created successfully!");
        router.push("/dashboard");
      } else {
        const errorData = await agentRes.json();
        throw new Error(errorData.error || "Failed to create agent");
      }
    } catch (error) {
      console.error("Activation failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to activate agent");
    } finally {
      setIsActivating(false);
    }
  };

  const canProceed = (step: number) => {
    if (step === 0) return agentDescription.trim().length > 20;
    return true;
  };

  const isGmailConnected = gmailStatus.connected || connectedIntegrations.includes("gmail");

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-50 border-b border-stone-200 bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/templates" className="flex items-center gap-2 text-stone-600 hover:text-stone-800 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to Templates</span>
          </Link>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
        <div className="mx-auto max-w-2xl">
          {/* Header */}
          <div className="mb-8 flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500">
              <Wand2 className="h-7 w-7 text-white" />
            </div>
            <div>
              <span className="inline-block rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                Custom
              </span>
              <h1 className="mt-1 text-2xl font-bold text-stone-800">Create Your Own Agent</h1>
              <p className="text-stone-600">Describe what you need and we&apos;ll build it</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="mb-10">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                        index < currentStep
                          ? "border-violet-600 bg-violet-600 text-white"
                          : index === currentStep
                          ? "border-violet-600 text-violet-600"
                          : "border-stone-300 text-stone-400"
                      }`}
                    >
                      {index < currentStep ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <span className="text-sm font-semibold">{index + 1}</span>
                      )}
                    </div>
                    <span
                      className={`mt-2 text-xs font-medium ${
                        index <= currentStep ? "text-stone-800" : "text-stone-400"
                      }`}
                    >
                      {step}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`mx-2 h-0.5 w-12 md:w-20 ${
                        index < currentStep ? "bg-violet-600" : "bg-stone-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step 0: Describe */}
          {currentStep === 0 && (
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl text-stone-800">What should your agent do?</CardTitle>
                <CardDescription>
                  Describe in plain language what you want your AI agent to do. Be specific!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="agent-name" className="text-stone-700">Agent Name</Label>
                  <Input
                    id="agent-name"
                    placeholder="e.g., My Personal Assistant"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="mt-1 rounded-xl border-stone-200"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-stone-700">
                    What should your agent do? (be detailed!)
                  </Label>
                  <textarea
                    id="description"
                    placeholder="e.g., I want an agent that monitors my email for important messages from clients, summarizes them, and sends me a WhatsApp message every morning at 8am with a digest..."
                    value={agentDescription}
                    onChange={(e) => setAgentDescription(e.target.value)}
                    className="mt-1 h-40 w-full rounded-xl border border-stone-200 p-4 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-200"
                  />
                  <p className="mt-2 text-xs text-stone-500">
                    {agentDescription.length}/500 characters (minimum 20)
                  </p>
                </div>

                <div>
                  <Label className="text-stone-700">Preferred communication channel</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["whatsapp", "email", "slack", "telegram"].map((channel) => (
                      <button
                        key={channel}
                        type="button"
                        onClick={() => setPreferredChannel(channel)}
                        className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors capitalize ${
                          preferredChannel === channel
                            ? "bg-violet-600 text-white"
                            : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                        }`}
                      >
                        {channel}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 1: Connect */}
          {currentStep === 1 && (
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl text-stone-800">Connect your services</CardTitle>
                <CardDescription>
                  Connect services now or skip — you can add them later from your dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {checkingIntegrations ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
                    <span className="ml-2 text-stone-600">Checking connections...</span>
                  </div>
                ) : (
                  <>
                    {/* Gmail & Calendar */}
                    <div className="flex items-center justify-between rounded-xl border border-stone-200 p-4">
                      <div className="flex items-center gap-3">
                        {isGmailConnected ? (
                          <CheckCircle2 className="h-6 w-6 text-green-500" />
                        ) : (
                          <Circle className="h-6 w-6 text-stone-300" />
                        )}
                        <div className="flex items-center gap-2">
                          <Mail className="h-5 w-5 text-red-500" />
                          <Calendar className="h-5 w-5 text-blue-500" />
                          <div>
                            <p className="font-medium text-stone-800">Gmail & Calendar</p>
                            {isGmailConnected && gmailStatus.email ? (
                              <p className="text-sm text-green-600">Connected as {gmailStatus.email}</p>
                            ) : (
                              <p className="text-sm text-stone-500">Connect your Google account</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={handleConnectGmail}
                        disabled={isGmailConnected}
                        className={
                          isGmailConnected
                            ? "bg-green-100 text-green-700 hover:bg-green-100"
                            : "bg-violet-600 hover:bg-violet-700"
                        }
                      >
                        {isGmailConnected ? (
                          <><Check className="mr-2 h-4 w-4" /> Connected</>
                        ) : (
                          "Connect"
                        )}
                      </Button>
                    </div>

                    {/* WhatsApp */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-xl border border-stone-200 p-4">
                        <div className="flex items-center gap-3">
                          {connectedIntegrations.includes("whatsapp") ? (
                            <CheckCircle2 className="h-6 w-6 text-green-500" />
                          ) : (
                            <Circle className="h-6 w-6 text-stone-300" />
                          )}
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-green-500" />
                            <div>
                              <p className="font-medium text-stone-800">WhatsApp</p>
                              {connectedIntegrations.includes("whatsapp") ? (
                                <p className="text-sm text-green-600">Connected{whatsappPhone ? `: ${whatsappPhone}` : ""}</p>
                              ) : (
                                <p className="text-sm text-stone-500">Connect your WhatsApp number</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={handleConnectWhatsApp}
                          disabled={connectedIntegrations.includes("whatsapp")}
                          className={
                            connectedIntegrations.includes("whatsapp")
                              ? "bg-green-100 text-green-700 hover:bg-green-100"
                              : "bg-violet-600 hover:bg-violet-700"
                          }
                        >
                          {connectedIntegrations.includes("whatsapp") ? (
                            <><Check className="mr-2 h-4 w-4" /> Connected</>
                          ) : (
                            "Connect WhatsApp"
                          )}
                        </Button>
                      </div>
                      {showWhatsappForm && !connectedIntegrations.includes("whatsapp") && (
                        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-3">
                          <p className="text-sm text-stone-600">Enter your phone number and we&apos;ll send you a link to connect.</p>
                          <div className="flex gap-2">
                            <Input
                              placeholder="+1 (555) 123-4567"
                              value={whatsappPhone}
                              onChange={(e) => setWhatsappPhone(e.target.value)}
                              className="rounded-xl border-stone-200"
                            />
                            <Button
                              onClick={handleSaveWhatsAppPhone}
                              disabled={connectingWhatsapp || !whatsappPhone.trim()}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {connectingWhatsapp ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Slack */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-xl border border-stone-200 p-4">
                        <div className="flex items-center gap-3">
                          {connectedIntegrations.includes("slack") ? (
                            <CheckCircle2 className="h-6 w-6 text-green-500" />
                          ) : (
                            <Circle className="h-6 w-6 text-stone-300" />
                          )}
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-purple-500" />
                            <div>
                              <p className="font-medium text-stone-800">Slack</p>
                              {connectedIntegrations.includes("slack") ? (
                                <p className="text-sm text-green-600">Connected{slackStatus.team ? ` to ${slackStatus.team}` : ""}</p>
                              ) : (
                                <p className="text-sm text-stone-500">Connect your Slack workspace</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={handleConnectSlack}
                          disabled={connectedIntegrations.includes("slack")}
                          className={
                            connectedIntegrations.includes("slack")
                              ? "bg-green-100 text-green-700 hover:bg-green-100"
                              : "bg-violet-600 hover:bg-violet-700"
                          }
                        >
                          {connectedIntegrations.includes("slack") ? (
                            <><Check className="mr-2 h-4 w-4" /> Connected</>
                          ) : (
                            "Connect Slack"
                          )}
                        </Button>
                      </div>
                      {showSlackForm && !connectedIntegrations.includes("slack") && (
                        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-3">
                          <p className="text-sm text-stone-600">Paste a Slack webhook URL or bot token to connect manually.</p>
                          <div className="flex gap-2">
                            <Input
                              placeholder="https://hooks.slack.com/... or xoxb-..."
                              value={slackWebhook}
                              onChange={(e) => setSlackWebhook(e.target.value)}
                              className="rounded-xl border-stone-200"
                            />
                            <Button
                              onClick={handleSaveSlackWebhook}
                              disabled={connectingSlack || !slackWebhook.trim()}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              {connectingSlack ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Telegram */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-xl border border-stone-200 p-4">
                        <div className="flex items-center gap-3">
                          {connectedIntegrations.includes("telegram") ? (
                            <CheckCircle2 className="h-6 w-6 text-green-500" />
                          ) : (
                            <Circle className="h-6 w-6 text-stone-300" />
                          )}
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-blue-400" />
                            <div>
                              <p className="font-medium text-stone-800">Telegram</p>
                              {connectedIntegrations.includes("telegram") ? (
                                <p className="text-sm text-green-600">Connected{telegramStatus.bot_username ? ` as ${telegramStatus.bot_username}` : ""}</p>
                              ) : (
                                <p className="text-sm text-stone-500">Connect your Telegram bot</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => setShowTelegramForm(v => !v)}
                          disabled={connectedIntegrations.includes("telegram")}
                          className={
                            connectedIntegrations.includes("telegram")
                              ? "bg-green-100 text-green-700 hover:bg-green-100"
                              : "bg-violet-600 hover:bg-violet-700"
                          }
                        >
                          {connectedIntegrations.includes("telegram") ? (
                            <><Check className="mr-2 h-4 w-4" /> Connected</>
                          ) : (
                            "Connect Telegram"
                          )}
                        </Button>
                      </div>
                      {showTelegramForm && !connectedIntegrations.includes("telegram") && (
                        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-3">
                          <p className="text-sm text-stone-600">
                            Enter your Telegram bot token. Get one from{" "}
                            <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-violet-600 underline">@BotFather</a>
                            {" "}on Telegram.
                          </p>
                          <div className="flex gap-2">
                            <Input
                              placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                              value={telegramToken}
                              onChange={(e) => setTelegramToken(e.target.value)}
                              className="rounded-xl border-stone-200"
                            />
                            <Button
                              onClick={handleConnectTelegram}
                              disabled={connectingTelegram || !telegramToken.trim()}
                              className="bg-blue-500 hover:bg-blue-600"
                            >
                              {connectingTelegram ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="flex items-center gap-2 pt-2 text-sm text-stone-500">
                  <Lock className="h-4 w-4" />
                  <span>Your data is encrypted and secure. All integrations are optional.</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Preview */}
          {currentStep === 2 && (
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl text-stone-800">
                  <Sparkles className="h-5 w-5 text-violet-600" />
                  Preview your agent
                </CardTitle>
                <CardDescription>
                  We&apos;ve generated instructions for your agent. Feel free to edit them.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
                    <p className="mt-4 text-stone-600">Generating your agent instructions...</p>
                    <p className="text-sm text-stone-400">This may take a moment</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="agent-name-preview" className="text-stone-700">Agent Name</Label>
                      <Input
                        id="agent-name-preview"
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        className="mt-1 rounded-xl border-stone-200"
                      />
                    </div>

                    <div>
                      <Label className="text-stone-700">Agent Instructions (SOUL.md)</Label>
                      <textarea
                        value={generatedSoul}
                        onChange={(e) => setGeneratedSoul(e.target.value)}
                        className="mt-1 h-64 w-full rounded-xl border border-stone-200 p-4 font-mono text-sm focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-200"
                      />
                    </div>

                    <Button
                      variant="outline"
                      onClick={generateSoulWithAI}
                      disabled={isGenerating}
                      className="rounded-xl"
                    >
                      <Wand2 className="mr-2 h-4 w-4" />
                      Regenerate
                    </Button>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-xl bg-violet-50 p-4">
                        <p className="text-sm font-medium text-violet-700">Estimated daily cost</p>
                        <p className="text-lg font-semibold text-violet-900">{formatCents(50)}</p>
                      </div>
                      <div className="rounded-xl bg-stone-100 p-4">
                        <p className="text-sm font-medium text-stone-600">AI Model</p>
                        <p className="text-lg font-semibold text-stone-800">Claude Sonnet 4.5</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Activate */}
          {currentStep === 3 && (
            <Card className="rounded-2xl border-2 border-violet-200 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-br from-violet-50 to-pink-50 p-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <h2 className="mt-4 text-2xl font-bold text-stone-800">Your custom agent is ready!</h2>
                <p className="mt-2 text-stone-600">{agentName || "My Custom Agent"}</p>
              </div>
              <CardContent className="p-8">
                <div className="text-center">
                  <p className="text-3xl font-bold text-stone-800">$29<span className="text-lg font-normal text-stone-500">/month</span></p>
                  <p className="mt-1 text-stone-600">includes $10 in starter credits</p>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 text-sm text-stone-600">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>Your agent will start working immediately</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-stone-600">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>Track activity in your dashboard</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-stone-600">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>Edit instructions anytime from settings</span>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="mt-8 w-full bg-gradient-to-r from-violet-600 to-pink-500 hover:from-violet-700 hover:to-pink-600 rounded-xl py-6 text-lg"
                  onClick={handleActivate}
                  disabled={isActivating}
                >
                  {isActivating ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Activating...
                    </>
                  ) : (
                    "Activate Your Agent"
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep((prev) => prev - 1)}
              disabled={currentStep === 0}
              className="rounded-xl"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {currentStep < steps.length - 1 && (
              <Button
                onClick={() => setCurrentStep((prev) => prev + 1)}
                disabled={!canProceed(currentStep) || (currentStep === 2 && isGenerating)}
                className="bg-violet-600 hover:bg-violet-700 rounded-xl"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
