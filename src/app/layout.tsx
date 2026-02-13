import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const dynamic = 'force-dynamic';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The One - Your AI Employee",
  description: "The only AI employee you need. Pick a template. Answer a few questions. Your agent starts working in 5 minutes.",
  keywords: ["AI", "automation", "AI agent", "AI assistant", "email automation", "productivity"],
  authors: [{ name: "The One" }],
  openGraph: {
    title: "The One - Your AI Employee",
    description: "The only AI employee you need. Pick a template. Answer a few questions. Your agent starts working in 5 minutes.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#7C3AED",
          colorBackground: "#FFFFFF",
          colorInputBackground: "#FFFFFF",
          colorInputText: "#1C1917",
          borderRadius: "0.75rem",
        },
        elements: {
          formButtonPrimary: "bg-violet-600 hover:bg-violet-700",
          card: "shadow-lg border border-stone-200",
          headerTitle: "text-stone-800",
          headerSubtitle: "text-stone-600",
          socialButtonsBlockButton: "border-stone-200 hover:bg-stone-50",
          formFieldInput: "border-stone-200 focus:border-violet-300 focus:ring-violet-200",
          footerActionLink: "text-violet-600 hover:text-violet-700",
        },
      }}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignInUrl="/templates"
      afterSignUpUrl="/templates"
    >
      <html lang="en" className="light">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <TooltipProvider>
            {children}
            <Toaster position="top-right" richColors />
          </TooltipProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
