"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Sparkles,
  Lock,
  Loader2,
  MessageSquare,
  Calendar,
} from "lucide-react";
import { templates as mockTemplates, type Template, type OnboardingQuestion, formatCents } from "@/lib/mock-data";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Mail,
  Sun,
  Search,
  PenTool,
  Home,
  Briefcase,
  BookOpen,
};

const steps = ["Configure", "Connect", "Preview", "Activate"];

interface GmailStatus {
  connected: boolean;
  email?: string;
}

interface WhatsAppStatus {
  connected: boolean;
  phone_number?: string;
  qr?: string;
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

export default function TemplateWizardPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [connectedIntegrations, setConnectedIntegrations] = useState<string[]>([]);
  const [generatedSoul, setGeneratedSoul] = useState<string>("");
  const [agentName, setAgentName] = useState("");
  const [isActivating, setIsActivating] = useState(false);
  const [gmailStatus, setGmailStatus] = useState<GmailStatus>({ connected: false });
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus>({ connected: false });
  const [slackStatus, setSlackStatus] = useState<SlackStatus>({ connected: false });
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus>({ connected: false });
  const [checkingIntegrations, setCheckingIntegrations] = useState(true);
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [slackWebhook, setSlackWebhook] = useState("");
  const [telegramToken, setTelegramToken] = useState("");
  const [connectingWhatsapp, setConnectingWhatsapp] = useState(false);
  const [connectingSlack, setConnectingSlack] = useState(false);
  const [connectingTelegram, setConnectingTelegram] = useState(false);
  const [showTelegramForm, setShowTelegramForm] = useState(false);
  const [showWhatsappForm, setShowWhatsappForm] = useState(false);
  const [showSlackForm, setShowSlackForm] = useState(false);

  const STORAGE_KEY = "onboarding_state";
  const GMAIL_STORAGE_KEY = "gmail_connected";

  // Check integration status from API
  const checkIntegrationStatus = useCallback(async () => {
    setCheckingIntegrations(true);
    try {
      // Check Gmail status
      const gmailRes = await fetch("/api/integrations/gmail/status");
      if (gmailRes.ok) {
        const data = await gmailRes.json();
        setGmailStatus(data);
        if (data.connected) {
          // Store in localStorage as backup
          localStorage.setItem(GMAIL_STORAGE_KEY, JSON.stringify({
            connected: true,
            email: data.email,
          }));
          setConnectedIntegrations(prev => {
            if (!prev.includes("gmail")) return [...prev, "gmail"];
            return prev;
          });
          if (data.email) {
            setAnswers(prev => ({ ...prev, email_account: data.email }));
          }
        }
      }

      // Check WhatsApp status
      const whatsappRes = await fetch("/api/integrations/whatsapp/status");
      if (whatsappRes.ok) {
        const data = await whatsappRes.json();
        setWhatsappStatus(data);
        if (data.connected) {
          setConnectedIntegrations(prev => {
            if (!prev.includes("whatsapp")) return [...prev, "whatsapp"];
            return prev;
          });
        }
      }

      // Check Slack status
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

      // Check Telegram status
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
      console.error("Failed to check integration status:", error);
      // Try localStorage fallback for Gmail
      const saved = localStorage.getItem(GMAIL_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.connected) {
            setGmailStatus(parsed);
            setConnectedIntegrations(prev => {
              if (!prev.includes("gmail")) return [...prev, "gmail"];
              return prev;
            });
          }
        } catch {}
      }
    } finally {
      setCheckingIntegrations(false);
    }
  }, []);

  // Check integrations on mount and when step changes to 1
  useEffect(() => {
    checkIntegrationStatus();
  }, [checkIntegrationStatus]);

  // Restore state from localStorage and check URL params on mount
  useEffect(() => {
    const connected = searchParams.get("connected");
    const email = searchParams.get("email");
    const stepParam = searchParams.get("step");

    // Try to restore saved state from localStorage
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.slug === slug) {
          if (parsed.answers) setAnswers(parsed.answers);
          if (parsed.connectedIntegrations) setConnectedIntegrations(parsed.connectedIntegrations);
          if (parsed.agentName) setAgentName(parsed.agentName);
        }
      } catch {
        console.error("Failed to parse saved onboarding state");
      }
    }

    // Handle OAuth callback
    if (connected) {
      setConnectedIntegrations((prev) => {
        if (!prev.includes(connected)) {
          toast.success(`${connected} connected successfully!`);
          return [...prev, connected];
        }
        return prev;
      });
      if (connected === "gmail" && email) {
        setAnswers((prev) => ({ ...prev, email_account: email }));
        setGmailStatus({ connected: true, email });
        // Save to localStorage
        localStorage.setItem(GMAIL_STORAGE_KEY, JSON.stringify({
          connected: true,
          email,
        }));
      }
      // Clean URL params
      const url = new URL(window.location.href);
      url.searchParams.delete("connected");
      url.searchParams.delete("email");
      window.history.replaceState({}, "", url.toString());
    }

    // Restore step from URL param
    if (stepParam) {
      const stepNum = parseInt(stepParam, 10);
      if (!isNaN(stepNum) && stepNum >= 0 && stepNum < steps.length) {
        setCurrentStep(stepNum);
      }
      // Clean step param
      const url = new URL(window.location.href);
      url.searchParams.delete("step");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams, slug]);

  // Fetch template
  useEffect(() => {
    const found = mockTemplates.find((t) => t.slug === slug);
    if (found) {
      setTemplate(found);
      if (!agentName) setAgentName(found.name);
    }
    setLoading(false);
  }, [slug, agentName]);

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleConnectGmail = () => {
    // Save current state to localStorage before OAuth redirect
    const stateToSave = {
      slug,
      answers,
      connectedIntegrations,
      agentName,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));

    const url = `/api/integrations/gmail/connect?template=${slug}&agent_id=new`;
    window.location.href = url;
  };

  const handleConnectSlack = () => {
    // If SLACK_CLIENT_ID is configured, do real OAuth
    if (slackStatus.configured !== false) {
      const stateToSave = {
        slug,
        answers,
        connectedIntegrations,
        agentName,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      const url = `/api/integrations/slack/connect?template=${slug}`;
      window.location.href = url;
    } else {
      // Show manual webhook input
      setShowSlackForm(true);
    }
  };

  const handleSaveSlackWebhook = async () => {
    if (!slackWebhook.trim()) return;
    setConnectingSlack(true);
    try {
      // Save the webhook/token as a manual Slack connection
      const res = await fetch("/api/integrations/slack/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhook_url: slackWebhook }),
      });
      if (res.ok) {
        setSlackStatus({ connected: true, team: "Manual" });
        setConnectedIntegrations(prev => {
          if (!prev.includes("slack")) return [...prev, "slack"];
          return prev;
        });
        setShowSlackForm(false);
        toast.success("Slack connected successfully!");
      } else {
        // Even if API fails, mark as connected locally for onboarding
        setSlackStatus({ connected: true, team: "Manual" });
        setConnectedIntegrations(prev => {
          if (!prev.includes("slack")) return [...prev, "slack"];
          return prev;
        });
        setShowSlackForm(false);
        toast.success("Slack webhook saved!");
      }
    } catch {
      // Save locally anyway — will be stored on agent creation
      setSlackStatus({ connected: true, team: "Manual" });
      setConnectedIntegrations(prev => {
        if (!prev.includes("slack")) return [...prev, "slack"];
        return prev;
      });
      setShowSlackForm(false);
      toast.success("Slack webhook saved!");
    } finally {
      setConnectingSlack(false);
    }
  };

  const handleConnectWhatsApp = () => {
    setShowWhatsappForm(true);
  };

  const handleSaveWhatsAppPhone = async () => {
    if (!whatsappPhone.trim()) return;
    setConnectingWhatsapp(true);
    try {
      // Try the WhatsApp connect endpoint
      const res = await fetch(`/api/integrations/whatsapp/connect?agent_id=new&template=${slug}`);
      if (res.ok) {
        setWhatsappStatus({ connected: true, phone_number: whatsappPhone });
        setConnectedIntegrations(prev => {
          if (!prev.includes("whatsapp")) return [...prev, "whatsapp"];
          return prev;
        });
        setShowWhatsappForm(false);
        toast.success("WhatsApp connection initiated!");
        return;
      }
    } catch {
      // WhatsApp bridge not available
    }
    // Fallback: save phone number locally, will connect after agent is live
    setWhatsappStatus({ connected: true, phone_number: whatsappPhone });
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

  const generateSoulPreview = async () => {
    if (!template) return;
    try {
      const res = await fetch("/api/onboarding/generate-soul", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_slug: slug,
          answers: { ...answers, user_name: "You" },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedSoul(data.soul_md);
      }
    } catch (error) {
      console.error("Failed to generate SOUL:", error);
    }
  };

  const handleActivate = async () => {
    if (!template) return;
    setIsActivating(true);
    try {
      // Generate final SOUL
      const soulRes = await fetch("/api/onboarding/generate-soul", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_slug: slug,
          answers: { ...answers, user_name: "User" },
        }),
      });
      const soulData = await soulRes.json();

      // Create agent
      const agentRes = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_slug: slug,
          display_name: agentName,
          soul_md: soulData.soul_md,
          config: answers,
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
        // Clear saved state from localStorage on successful completion
        localStorage.removeItem(STORAGE_KEY);
        if (agentData.message) {
          toast.success(agentData.message);
        } else {
          toast.success("Agent created successfully!");
        }
        router.push("/dashboard");
      } else {
        const errorData = await agentRes.json();
        throw new Error(errorData.error || "Failed to create agent");
      }
    } catch (error) {
      console.error("Activation failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to activate agent. Please try again.");
    } finally {
      setIsActivating(false);
    }
  };

  // Generate preview when on step 2
  useEffect(() => {
    if (currentStep === 2 && template) {
      generateSoulPreview();
    }
  }, [currentStep, template]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-16">
          <Skeleton className="mx-auto h-8 w-64" />
          <Skeleton className="mx-auto mt-4 h-4 w-96" />
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-stone-800">Template not found</h1>
          <p className="mt-2 text-stone-600">The template you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/templates">
            <Button className="mt-4">Back to Templates</Button>
          </Link>
        </div>
      </div>
    );
  }

  const Icon = iconMap[template.icon] || Mail;
  const questions = template.onboarding_questions as OnboardingQuestion[];
  const requiredIntegrations = template.required_integrations;

  const allQuestionsAnswered = questions
    .filter((q) => q.type !== "oauth")
    .every((q) => answers[q.id]?.trim());

  const canProceed = (step: number) => {
    if (step === 0) return allQuestionsAnswered;
    return true;
  };

  const isGmailConnected = gmailStatus.connected || connectedIntegrations.includes("gmail");

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
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
          {/* Template Header */}
          <div className="mb-8 flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100">
              <Icon className="h-7 w-7 text-violet-600" />
            </div>
            <div>
              <span className="inline-block rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                {template.category}
              </span>
              <h1 className="mt-1 text-2xl font-bold text-stone-800">{template.name}</h1>
              <p className="text-stone-600">{template.hook}</p>
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

          {/* Step 0: Configure */}
          {currentStep === 0 && (
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl text-stone-800">Configure your agent</CardTitle>
                <CardDescription>
                  Answer a few questions so your agent knows exactly what to do.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {questions
                  .filter((q) => q.type !== "oauth")
                  .map((question, index) => (
                    <div key={question.id} className="space-y-2">
                      <Label htmlFor={question.id} className="text-stone-700">
                        {index + 1}. {question.question}
                      </Label>
                      {question.type === "text" && (
                        <Input
                          id={question.id}
                          placeholder={question.placeholder}
                          value={answers[question.id] || ""}
                          onChange={(e) => handleAnswer(question.id, e.target.value)}
                          className="rounded-xl border-stone-200 py-5 focus:border-violet-300 focus:ring-violet-200"
                        />
                      )}
                      {question.type === "time" && (
                        <Input
                          id={question.id}
                          type="time"
                          value={answers[question.id] || ""}
                          onChange={(e) => handleAnswer(question.id, e.target.value)}
                          className="w-40 rounded-xl border-stone-200 focus:border-violet-300 focus:ring-violet-200"
                        />
                      )}
                      {question.type === "select" && question.options && (
                        <div className="flex flex-wrap gap-2">
                          {question.options.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => handleAnswer(question.id, option)}
                              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                                answers[question.id] === option
                                  ? "bg-violet-600 text-white"
                                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      )}
                      {question.type === "multi-select" && question.options && (
                        <div className="flex flex-wrap gap-2">
                          {question.options.map((option) => {
                            const selected = (answers[question.id] || "").split(",").includes(option);
                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => {
                                  const current = answers[question.id]?.split(",").filter(Boolean) || [];
                                  if (selected) {
                                    handleAnswer(question.id, current.filter((o) => o !== option).join(","));
                                  } else {
                                    handleAnswer(question.id, [...current, option].join(","));
                                  }
                                }}
                                className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                                  selected
                                    ? "bg-violet-600 text-white"
                                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                                }`}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}

          {/* Step 1: Connect */}
          {currentStep === 1 && (
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl text-stone-800">Connect your services</CardTitle>
                <CardDescription>
                  Connect services now or skip — you can always add them later from your dashboard.
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
                    {requiredIntegrations.includes("gmail") && (
                      <div>
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
                              <>
                                <Check className="mr-2 h-4 w-4" /> Connected
                              </>
                            ) : (
                              "Connect Gmail"
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* WhatsApp */}
                    {requiredIntegrations.includes("whatsapp") && (
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
                                {connectedIntegrations.includes("whatsapp") && whatsappStatus.phone_number ? (
                                  <p className="text-sm text-green-600">Connected: {whatsappStatus.phone_number}</p>
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
                    )}

                    {/* Slack */}
                    {requiredIntegrations.includes("slack") && (
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
                    )}

                    {/* Telegram */}
                    {requiredIntegrations.includes("telegram") && (
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
                    )}
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
            <div className="space-y-6">
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl text-stone-800">
                    <Sparkles className="h-5 w-5 text-violet-600" />
                    Preview your agent
                  </CardTitle>
                  <CardDescription>
                    Everything look good? Make adjustments or continue to activate.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="agent-name" className="text-stone-700">Agent Name</Label>
                    <Input
                      id="agent-name"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      className="mt-1 rounded-xl border-stone-200"
                    />
                  </div>

                  <div className="rounded-xl bg-stone-100 p-4">
                    <h4 className="font-medium text-stone-800">What your agent will do:</h4>
                    <ul className="mt-2 space-y-1 text-sm text-stone-600">
                      {Object.entries(answers).slice(0, 4).map(([key, value]) => (
                        <li key={key} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-stone-600">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>
                      Connected: {connectedIntegrations.length > 0
                        ? connectedIntegrations.map(i => {
                            if (i === "gmail") return `Gmail (${gmailStatus.email || "connected"})`;
                            return i;
                          }).join(", ")
                        : "None yet (you can connect later)"}
                    </span>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl bg-violet-50 p-4">
                      <p className="text-sm font-medium text-violet-700">Estimated daily cost</p>
                      <p className="text-lg font-semibold text-violet-900">
                        {formatCents(template.estimated_daily_credits)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-stone-100 p-4">
                      <p className="text-sm font-medium text-stone-600">AI Model</p>
                      <p className="text-lg font-semibold text-stone-800">Claude Sonnet 4.5</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Activate */}
          {currentStep === 3 && (
            <Card className="rounded-2xl border-2 border-violet-200 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-br from-violet-50 to-pink-50 p-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100">
                  <Zap className="h-8 w-8 text-violet-600" />
                </div>
                <h2 className="mt-4 text-2xl font-bold text-stone-800">Your agent is ready!</h2>
                <p className="mt-2 text-stone-600">{agentName}</p>
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
                    <span>Auto-recharge $25 when credits run low</span>
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
                disabled={!canProceed(currentStep)}
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
