import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* -------------------------------------------------------
   BUSINESS OS GLASS CARD CONTAINER
------------------------------------------------------- */
function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl
        border border-white/[0.085]
        bg-[#10151d]/95
        shadow-[0_18px_60px_rgba(0,0,0,0.35)]
        ${className}
      `}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-cyan-500/[0.04] blur-3xl" />
      {children}
    </div>
  );
}

export default function Login() {
  const { session, isLoading, signIn } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isSignUp = mode === "signup";
  const isForgot = mode === "forgot";

  const switchMode = (next: "signin" | "signup" | "forgot") => {
    setMode(next);
    setError("");
    setSuccess("");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07090e]">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    if (isForgot) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        setError(error.message);
      } else {
        setSuccess("If that email is registered, a password reset link is on its way.");
      }
    } else if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) {
        setError(error.message);
      } else {
        setSuccess("Check your email to confirm your account before signing in.");
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) setError(error.message);
    }

    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07090e] px-4 text-slate-200">
      <div className="w-full max-w-md">
        {/* BRAND HEADER */}
        <div className="mb-8 text-center space-y-2">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-400 shadow-inner mb-1"
          >
            <Lock className="h-6 w-6" />
          </motion.div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl font-mono">
            MASTER FLOW
          </h1>
          <p className="text-xs text-slate-400">
            Workflow &amp; operations management for any business
          </p>
        </div>

        <GlassCard>
          {/* CARD HEADER */}
          <div className="border-b border-white/[0.085] bg-white/[0.02] px-6 py-4">
            <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-slate-300">
              {isForgot ? "Reset Password" : isSignUp ? "Create Account" : "Sign In"}
            </h2>
          </div>

          <div className="p-6 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
                  {success}
                </div>
              )}

              {isForgot && (
                <p className="text-xs text-slate-400">
                  Enter your email address and we'll send you a link to set a new password.
                </p>
              )}

              <AnimatePresence mode="wait">
                {isSignUp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1.5 overflow-hidden"
                  >
                    <Label htmlFor="fullName" className="text-xs text-slate-300">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                      required
                      autoComplete="name"
                      className="h-10 rounded-xl border-white/[0.08] bg-[#0b0e14] text-slate-100 placeholder:text-slate-500 focus-visible:border-cyan-400/50 text-xs"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs text-slate-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                  className="h-10 rounded-xl border-white/[0.08] bg-[#0b0e14] text-slate-100 placeholder:text-slate-500 focus-visible:border-cyan-400/50 text-xs"
                />
              </div>

              {!isForgot && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs text-slate-300">Password</Label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => switchMode("forgot")}
                        className="text-[11px] font-medium text-cyan-400 hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    className="h-10 rounded-xl border-white/[0.08] bg-[#0b0e14] text-slate-100 placeholder:text-slate-500 focus-visible:border-cyan-400/50 text-xs"
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-10 bg-cyan-500 text-slate-950 font-semibold hover:bg-cyan-400 transition-colors text-xs rounded-xl shadow-[0_0_15px_rgba(34,211,238,0.25)]"
                disabled={submitting}
              >
                {submitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                {isForgot ? "Send reset link" : isSignUp ? "Create Account" : "Sign In"}
              </Button>
            </form>

            <div className="mt-5 text-center text-xs text-slate-400 border-t border-white/[0.085] pt-4">
              {isForgot ? (
                <p>
                  Remembered it?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signin")}
                    className="font-medium text-cyan-400 hover:underline"
                  >
                    Back to sign in
                  </button>
                </p>
              ) : isSignUp ? (
                <p>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signin")}
                    className="font-medium text-cyan-400 hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              ) : (
                <p>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    className="font-medium text-cyan-400 hover:underline"
                  >
                    Sign up
                  </button>
                </p>
              )}
            </div>
          </div>
        </GlassCard>

        <p className="mt-6 text-center text-[11px] text-slate-500">
          New companies can sign up free. Existing team members: ask your administrator for access.
        </p>
      </div>
    </div>
  );
}