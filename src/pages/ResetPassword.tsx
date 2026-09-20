import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Check, KeyRound, Loader2, ShieldAlert, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PASSWORD_RULES,
  passwordStrength,
  validatePasswordPair,
} from "@/lib/passwordPolicy";

/** Recovery sessions older than this are rejected client-side. */
const MAX_RECOVERY_AGE_MS = 15 * 60 * 1000;
const USED_TOKENS_KEY = "mf.recovery.usedTokens";

type LinkState = "checking" | "valid" | "invalid";

function readUsedTokens(): string[] {
  try {
    const raw = localStorage.getItem(USED_TOKENS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function markTokenUsed(id: string) {
  try {
    const next = [...readUsedTokens().filter((t) => t !== id), id].slice(-25);
    localStorage.setItem(USED_TOKENS_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — server still enforces single use */
  }
}

/** Non-reversible short fingerprint of a token; never stores the token itself. */
function fingerprint(token: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < token.length; i++) {
    h1 = (h1 ^ token.charCodeAt(i)) >>> 0;
    h1 = (h1 * 0x01000193) >>> 0;
    h2 = (h2 + token.charCodeAt(i) * (i + 1)) >>> 0;
  }
  return `${h1.toString(36)}${h2.toString(36)}`;
}

function decodeIssuedAt(jwt: string): number | null {
  try {
    const payload = JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.iat === "number" ? payload.iat * 1000 : null;
  } catch {
    return null;
  }
}

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

export default function ResetPassword() {
  const navigate = useNavigate();
  const [linkState, setLinkState] = useState<LinkState>("checking");
  const [linkError, setLinkError] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const tokenIdRef = useRef<string | null>(null);

  const invalidate = useCallback((message: string) => {
    setLinkError(message);
    setLinkState("invalid");
  }, []);

  const acceptSession = useCallback(
    (accessToken: string) => {
      const id = fingerprint(accessToken);
      if (readUsedTokens().includes(id)) {
        invalidate("This reset link has already been used. Request a new one to continue.");
        return;
      }
      const issuedAt = decodeIssuedAt(accessToken);
      if (issuedAt && Date.now() - issuedAt > MAX_RECOVERY_AGE_MS) {
        invalidate("This reset link has expired. Request a new password reset email.");
        return;
      }
      tokenIdRef.current = id;
      setLinkState("valid");
    },
    [invalidate],
  );

  useEffect(() => {
    // Surface errors Supabase returns in the URL (expired / already consumed links).
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const urlError = hash.get("error_description") || query.get("error_description");
    const errorCode = hash.get("error_code") || query.get("error_code");
    if (urlError || errorCode) {
      invalidate(
        errorCode === "otp_expired"
          ? "This reset link has expired or was already used. Request a new password reset email."
          : urlError || "This reset link is no longer valid.",
      );
      return;
    }

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session?.access_token) {
        acceptSession(session.access_token);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        acceptSession(session.access_token);
      } else {
        // Give the SDK a moment to consume the recovery hash before failing.
        setTimeout(() => {
          setLinkState((s) => {
            if (s !== "checking") return s;
            setLinkError(
              "No valid recovery link detected. Request a new password reset email from the sign-in page.",
            );
            return "invalid";
          });
        }, 3000);
      }
    });

    return () => data.subscription.unsubscribe();
  }, [acceptSession, invalidate]);

  const ruleResults = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, ok: rule.test(password) })),
    [password],
  );
  const strength = useMemo(() => passwordStrength(password), [password]);
  const validationErrors = useMemo(
    () => validatePasswordPair(password, confirm),
    [password, confirm],
  );
  const canSubmit = validationErrors.length === 0 && confirm.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setTouched(true);
    if (!canSubmit) {
      setError(validationErrors[0] ?? "Confirm your new password to continue.");
      return;
    }

    setSubmitting(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setSubmitting(false);
      invalidate("Your recovery session ended. Request a new password reset email.");
      return;
    }
    const issuedAt = decodeIssuedAt(accessToken);
    if (issuedAt && Date.now() - issuedAt > MAX_RECOVERY_AGE_MS) {
      setSubmitting(false);
      invalidate("This reset link has expired. Request a new password reset email.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setSubmitting(false);
      setError(updateError.message);
      return;
    }

    // Burn the link: record it as used and end every session created from it.
    markTokenUsed(tokenIdRef.current ?? fingerprint(accessToken));
    await supabase.auth.signOut({ scope: "global" });
    setSubmitting(false);
    setSuccess("Password updated. Sign in with your new password.");
    setTimeout(() => navigate("/login", { replace: true }), 2000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07090e] px-4 py-10 text-slate-200">
      <div className="w-full max-w-md">
        {/* BRAND HEADER */}
        <div className="mb-8 text-center space-y-2">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-400 shadow-inner mb-1"
          >
            <KeyRound className="h-6 w-6" />
          </motion.div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl font-mono">
            MASTER FLOW
          </h1>
          <p className="text-xs text-slate-400">Set a new secure password</p>
        </div>

        <GlassCard>
          {/* CARD HEADER */}
          <div className="border-b border-white/[0.085] bg-white/[0.02] px-6 py-4">
            <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-slate-300">
              Reset Password
            </h2>
          </div>

          <div className="p-6">
            {success ? (
              <div className="space-y-4 text-center">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
                  {success}
                </div>
                <Button
                  className="w-full h-10 bg-cyan-500 text-slate-950 font-semibold hover:bg-cyan-400 transition-colors text-xs rounded-xl shadow-[0_0_15px_rgba(34,211,238,0.25)]"
                  onClick={() => navigate("/login", { replace: true })}
                >
                  Go to sign in
                </Button>
              </div>
            ) : linkState === "checking" ? (
              <div className="space-y-4 text-center text-xs text-slate-400 py-6">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-cyan-400" />
                <p>Verifying your recovery link...</p>
              </div>
            ) : linkState === "invalid" ? (
              <div className="space-y-4 text-center text-xs">
                <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-left text-red-300">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  <span>{linkError}</span>
                </div>
                <Button
                  className="w-full h-10 bg-cyan-500 text-slate-950 font-semibold hover:bg-cyan-400 transition-colors text-xs rounded-xl shadow-[0_0_15px_rgba(34,211,238,0.25)]"
                  onClick={() => navigate("/login")}
                >
                  Request a new reset link
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {error && (
                  <div className="flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="new-password" className="text-xs text-slate-300">
                    New password
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setTouched(true)}
                    placeholder="••••••••••"
                    required
                    maxLength={72}
                    autoComplete="new-password"
                    aria-describedby="password-rules"
                    className="h-10 rounded-xl border-white/[0.08] bg-[#0b0e14] text-slate-100 placeholder:text-slate-500 focus-visible:border-cyan-400/50 text-xs"
                  />
                  <Progress value={strength.score} className="h-1.5 bg-white/10" />
                  <p className="text-[11px] text-slate-400">
                    Password strength: <span className="font-medium text-slate-200">{strength.label}</span>
                  </p>
                </div>

                <ul id="password-rules" className="space-y-1.5 text-xs pt-1">
                  {ruleResults.map((rule) => (
                    <li
                      key={rule.id}
                      className={
                        rule.ok
                          ? "flex items-center gap-2 text-emerald-400"
                          : touched || password.length > 0
                            ? "flex items-center gap-2 text-red-400"
                            : "flex items-center gap-2 text-slate-500"
                      }
                    >
                      {rule.ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                      <span>{rule.label}</span>
                    </li>
                  ))}
                </ul>

                <div className="space-y-1.5 pt-2">
                  <Label htmlFor="confirm-password" className="text-xs text-slate-300">
                    Confirm new password
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    onBlur={() => setTouched(true)}
                    placeholder="••••••••••"
                    required
                    maxLength={72}
                    autoComplete="new-password"
                    className="h-10 rounded-xl border-white/[0.08] bg-[#0b0e14] text-slate-100 placeholder:text-slate-500 focus-visible:border-cyan-400/50 text-xs"
                  />
                  {confirm.length > 0 && confirm !== password && (
                    <p className="text-[11px] text-red-400">Passwords do not match.</p>
                  )}
                </div>

                <AnimatePresence>
                  {touched && validationErrors.length > 0 && (
                    <motion.ul
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 overflow-hidden"
                    >
                      {validationErrors.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>

                <Button
                  type="submit"
                  className="w-full h-10 bg-cyan-500 text-slate-950 font-semibold hover:bg-cyan-400 transition-colors text-xs rounded-xl shadow-[0_0_15px_rgba(34,211,238,0.25)] mt-2"
                  disabled={submitting || !canSubmit}
                >
                  {submitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  Update password
                </Button>
              </form>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}