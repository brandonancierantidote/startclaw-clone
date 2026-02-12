"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MessageSquare,
  RefreshCw,
  Smartphone,
} from "lucide-react";

function WhatsAppConnectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const agentId = searchParams.get("agent_id") || "";

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchQR = useCallback(async () => {
    try {
      const res = await fetch(`/api/integrations/whatsapp/qr?agent_id=${agentId}`);
      const data = await res.json();

      if (data.authenticated) {
        setAuthenticated(true);
        setPhone(data.phone);
        setQrCode(null);
        toast.success("WhatsApp connected!");
      } else if (data.qr) {
        setQrCode(data.qr);
        setAuthenticated(false);
      } else if (data.status === "initializing") {
        // Still initializing, will retry
        setQrCode(null);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      console.error("Failed to fetch QR:", err);
      setError("Failed to connect to WhatsApp service");
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  // Initial fetch and polling
  useEffect(() => {
    fetchQR();

    // Poll every 3 seconds until authenticated
    const interval = setInterval(() => {
      if (!authenticated) {
        fetchQR();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchQR, authenticated]);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-stone-200 bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/settings" className="flex items-center gap-2 text-stone-600 hover:text-stone-800 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back to Settings</span>
            </Link>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
        <div className="mx-auto max-w-md">
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 mb-4">
                <MessageSquare className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-xl text-stone-800">Connect WhatsApp</CardTitle>
              <CardDescription>
                Scan the QR code with WhatsApp on your phone
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                  <p className="mt-4 text-stone-600">Starting WhatsApp connection...</p>
                </div>
              ) : authenticated ? (
                <div className="flex flex-col items-center py-8">
                  <CheckCircle2 className="h-16 w-16 text-green-500" />
                  <h3 className="mt-4 text-lg font-semibold text-stone-800">Connected!</h3>
                  <p className="mt-2 text-stone-600">
                    WhatsApp connected to {phone}
                  </p>
                  <Button
                    onClick={() => router.push("/dashboard/settings")}
                    className="mt-6 bg-green-600 hover:bg-green-700 rounded-xl"
                  >
                    Continue to Settings
                  </Button>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center py-8">
                  <div className="text-red-500 mb-4">
                    <MessageSquare className="h-12 w-12" />
                  </div>
                  <p className="text-red-600 text-center">{error}</p>
                  <Button
                    onClick={() => {
                      setError(null);
                      setLoading(true);
                      fetchQR();
                    }}
                    variant="outline"
                    className="mt-4 rounded-xl"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again
                  </Button>
                </div>
              ) : qrCode ? (
                <div className="flex flex-col items-center">
                  <div className="rounded-xl border-4 border-white shadow-lg overflow-hidden bg-white p-2">
                    <img
                      src={qrCode}
                      alt="WhatsApp QR Code"
                      className="w-64 h-64"
                    />
                  </div>
                  <div className="mt-6 space-y-3 text-sm text-stone-600">
                    <div className="flex items-start gap-3">
                      <Smartphone className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <p>Open WhatsApp on your phone</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600 text-xs font-bold flex-shrink-0">2</span>
                      <p>Tap Menu or Settings and select Linked Devices</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600 text-xs font-bold flex-shrink-0">3</span>
                      <p>Point your phone at this screen to capture the QR code</p>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center text-xs text-stone-400">
                    <Loader2 className="h-3 w-3 animate-spin mr-2" />
                    Waiting for scan...
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                  <p className="mt-4 text-stone-600">Generating QR code...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="flex flex-col items-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        <p className="mt-4 text-stone-600">Loading...</p>
      </div>
    </div>
  );
}

export default function WhatsAppConnectPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <WhatsAppConnectContent />
    </Suspense>
  );
}
