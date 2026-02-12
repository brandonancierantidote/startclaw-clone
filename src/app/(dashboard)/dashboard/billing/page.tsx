"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Zap,
  ArrowLeft,
  Plus,
  CreditCard,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { mockCredits, mockCreditTransactions, formatCents, getRelativeTime } from "@/lib/mock-data";

interface Credits {
  balance_cents: number;
  auto_recharge_enabled: boolean;
  transactions: {
    id: string;
    amount_cents: number;
    type: string;
    description: string;
    balance_after_cents: number;
    created_at: string;
  }[];
}

export default function BillingPage() {
  const [credits, setCredits] = useState<Credits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCredits() {
      try {
        const res = await fetch("/api/credits");
        if (res.ok) {
          const data = await res.json();
          setCredits(data);
        } else {
          setCredits({
            ...mockCredits,
            transactions: mockCreditTransactions,
          });
        }
      } catch {
        setCredits({
          ...mockCredits,
          transactions: mockCreditTransactions,
        });
      } finally {
        setLoading(false);
      }
    }
    fetchCredits();
  }, []);

  const handleRecharge = async () => {
    try {
      const res = await fetch("/api/billing/recharge", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setCredits((prev) =>
          prev
            ? {
                ...prev,
                balance_cents: data.balance_cents,
                transactions: [
                  {
                    id: `tx-${Date.now()}`,
                    amount_cents: 2500,
                    type: "credit",
                    description: "Manual recharge",
                    balance_after_cents: data.balance_cents,
                    created_at: new Date().toISOString(),
                  },
                  ...prev.transactions,
                ],
              }
            : null
        );
        toast.success("$25 credits added!");
      }
    } catch {
      toast.error("Failed to add credits");
    }
  };

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
            <h1 className="text-2xl font-bold text-stone-800">Billing & Credits</h1>
            <p className="text-stone-600">Manage your subscription and credits</p>
          </div>

          {/* Current Plan */}
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg text-stone-800">The One Standard</CardTitle>
                  <CardDescription>Your current plan</CardDescription>
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Active
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-stone-800">$29</span>
                <span className="text-stone-500">/month</span>
              </div>
              <Button variant="outline" className="mt-4 rounded-xl" onClick={() => toast.info("Subscription management coming soon")}>
                Manage Subscription
              </Button>
            </CardContent>
          </Card>

          {/* Credit Balance */}
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-stone-800">Credit Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-4xl font-bold text-stone-800">
                    {credits ? formatCents(credits.balance_cents) : "$0.00"}
                  </p>
                  <p className="mt-1 text-sm text-stone-500">remaining</p>
                </div>
                <Button
                  onClick={handleRecharge}
                  className="bg-violet-600 hover:bg-violet-700 rounded-xl"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add $25 Credits
                </Button>
              </div>
              <div className="mt-4 h-3 rounded-full bg-stone-100">
                <div
                  className="h-3 rounded-full bg-violet-600 transition-all"
                  style={{
                    width: `${Math.min(100, ((credits?.balance_cents || 0) / 2500) * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-stone-500">
                Auto-recharge: {credits?.auto_recharge_enabled ? (
                  <span className="text-green-600">Enabled</span>
                ) : (
                  <span className="text-stone-400">Disabled</span>
                )}
                <span className="ml-2">• Recharges $25 when balance drops below $5</span>
              </p>
            </CardContent>
          </Card>

          {/* Transaction History */}
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-stone-800">Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-xl border border-stone-200">
                <table className="w-full">
                  <thead className="bg-stone-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">Description</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 uppercase">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {credits?.transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-stone-50">
                        <td className="px-4 py-3 text-sm text-stone-600">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-stone-800">{tx.description}</td>
                        <td className="px-4 py-3 text-right text-sm">
                          <span className={`flex items-center justify-end gap-1 ${tx.type === "credit" ? "text-green-600" : "text-red-600"}`}>
                            {tx.type === "credit" ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {tx.type === "credit" ? "+" : "-"}{formatCents(Math.abs(tx.amount_cents))}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-stone-600">
                          {formatCents(tx.balance_after_cents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
