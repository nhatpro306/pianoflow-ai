"use client";

import { useAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ShieldCheck, Mail, Lock } from "lucide-react";

function LoginForm() {
  const { signIn, signUp, user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(searchParams.get("error"));
  const [submitting, setSubmitting] = useState(false);
  const [signupSent, setSignupSent] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          <span className="text-xs font-mono">Loading authentication…</span>
        </div>
      </div>
    );
  }

  if (user) {
    router.replace("/projects");
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
        router.push("/projects");
      } else {
        const loggedIn = await signUp(email, password);
        if (loggedIn) {
          router.push("/projects");
        } else {
          setSignupSent(true);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOAuth(provider: "google" | "github") {
    try {
      setError(null);
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: typeof window !== "undefined" ? `${window.location.origin}/projects` : undefined,
        },
      });
      if (oauthError) throw oauthError;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to authenticate with ${provider}.`);
    }
  }

  return (
    <div className="relative min-h-[85vh] flex items-center justify-center px-4 py-16">
      {/* Concert stage ambient radial glow mesh */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_70%_at_50%_40%,rgba(124,58,237,0.18),rgba(6,182,212,0.06),transparent_75%)]"
        aria-hidden="true"
      />

      <Card
        className="relative z-10 max-w-md w-full bg-[#121215]/90 border-white/10 shadow-2xl backdrop-blur-xl p-8 rounded-3xl"
        data-testid="auth-card"
      >
        {/* Brand Header */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2 mb-2 group">
            <span className="text-2xl select-none" aria-hidden="true">
              🎹
            </span>
            <span className="text-xl font-bold tracking-tight text-zinc-100 group-hover:text-white transition-colors">
              PianoFlow <span className="text-cyan-400">AI</span>
            </span>
          </Link>
          <p className="text-xs sm:text-sm text-zinc-400">
            Your intelligent piano learning &amp; transcription studio
          </p>
        </div>

        {/* Mode Switch Tabs */}
        <div className="mb-6 flex rounded-xl border border-white/10 bg-zinc-900/80 p-1">
          <button
            type="button"
            data-testid="auth-tab-login"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
              mode === "login"
                ? "bg-white/10 text-white shadow-sm border border-white/10"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            data-testid="auth-tab-signup"
            onClick={() => {
              setMode("signup");
              setError(null);
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
              mode === "signup"
                ? "bg-white/10 text-white shadow-sm border border-white/10"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Create Account
          </button>
        </div>

        {signupSent ? (
          <div className="rounded-2xl border border-cyan-800/80 bg-cyan-950/30 p-6 text-center animate-in fade-in">
            <Badge variant="accent" dot className="mb-3">
              Verification Dispatched
            </Badge>
            <p className="text-sm font-semibold text-zinc-200 mb-1">
              Check your inbox
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              We sent a confirmation link to <span className="font-mono text-cyan-300">{email}</span>. Click it to activate your studio access.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-6"
              onClick={() => {
                setSignupSent(false);
                setMode("login");
              }}
            >
              Back to Sign In
            </Button>
          </div>
        ) : (
          <>
            {/* Social Authentication Buttons */}
            <div className="space-y-2.5 mb-6">
              <Button
                variant="secondary"
                size="md"
                onClick={() => handleOAuth("google")}
                className="w-full border-white/10 hover:border-white/20 gap-3"
                data-testid="oauth-google-btn"
              >
                {/* Google SVG */}
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.57 0 2.98.54 4.09 1.43l3.07-3.07C17.29 1.63 14.81 1 12 1 7.42 1 3.53 3.61 1.66 7.41l3.74 2.9C6.29 7.45 8.9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.73 2.9c2.18-2.02 3.69-4.99 3.69-8.72z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.4 14.69c-.24-.71-.38-1.47-.38-2.26s.14-1.55.38-2.26L1.66 7.27C.6 9.38 0 11.63 0 14s.6 4.62 1.66 6.73l3.74-2.92z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.24 0 5.95-1.08 7.93-2.91l-3.73-2.9c-1.07.73-2.44 1.16-4.2 1.16-3.1 0-5.71-2.45-6.6-5.31L1.66 16.08C3.53 19.88 7.42 22.5 12 22.5z"
                  />
                </svg>
                <span>Continue with Google</span>
              </Button>

              <Button
                variant="secondary"
                size="md"
                onClick={() => handleOAuth("github")}
                className="w-full border-white/10 hover:border-white/20 gap-3"
                data-testid="oauth-github-btn"
              >
                {/* GitHub SVG */}
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
                <span>Continue with GitHub</span>
              </Button>
            </div>

            {/* Visual Divider */}
            <div className="relative my-6 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <span className="relative bg-[#121215] px-3 text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                Or with email
              </span>
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email-input"
                  className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-300"
                >
                  <Mail className="h-3.5 w-3.5 text-zinc-400" />
                  Email Address
                </label>
                <Input
                  id="email-input"
                  type="email"
                  placeholder="name@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  data-testid="input-email"
                />
              </div>

              <div>
                <label
                  htmlFor="password-input"
                  className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-300"
                >
                  <Lock className="h-3.5 w-3.5 text-zinc-400" />
                  Password
                </label>
                <Input
                  id="password-input"
                  type="password"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  data-testid="input-password"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                variant="gradient"
                size="lg"
                isLoading={submitting}
                className="w-full shadow-lg shadow-violet-950/40"
                data-testid="auth-submit-btn"
              >
                {mode === "login" ? "Sign In to Studio" : "Create Free Account"}
              </Button>
            </form>
          </>
        )}

        {/* Security & Reassurance Footer */}
        <div className="mt-8 border-t border-white/5 pt-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Protected by Supabase Auth with end-to-end encryption.</span>
          </div>
          <p className="mt-1 text-[10px] text-zinc-600">
            No credit card required to start • Free tier included forever
          </p>
        </div>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center text-zinc-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
