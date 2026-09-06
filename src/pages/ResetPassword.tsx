import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Check, Loader2, ShieldAlert, X } from "lucide-react";
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
    <div className="flex min-h-screen items-center justify-center bg-primary px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-primary-foreground">
            MASTER FLOW
          </h1>
          <p className="mt-2 text-sm text-primary-foreground/70">Set a new password</p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-xl">Reset Password</CardTitle>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-4 text-center">
                <div className="rounded bg-green-500/10 p-3 text-sm text-green-700">{success}</div>
                <Button className="w-full" onClick={() => navigate("/login", { replace: true })}>
                  Go to sign in
                </Button>
              </div>
            ) : linkState === "checking" ? (
              <div className="space-y-4 text-center text-sm text-muted-foreground">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" />
                <p>Verifying your recovery link…</p>
              </div>
            ) : linkState === "invalid" ? (
              <div className="space-y-4 text-center text-sm">
                <div className="flex items-start gap-2 rounded bg-destructive/10 p-3 text-left text-destructive">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{linkError}</span>
                </div>
                <Button className="w-full" onClick={() => navigate("/login")}>
                  Request a new reset link
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {error && (
                  <div className="flex items-center gap-2 rounded bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
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
                  />
                  <Progress value={strength.score} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">
                    Password strength: <span className="font-medium">{strength.label}</span>
                  </p>
                </div>

                <ul id="password-rules" className="space-y-1 text-xs">
                  {ruleResults.map((rule) => (
                    <li
                      key={rule.id}
                      className={
                        rule.ok
                          ? "flex items-center gap-2 text-green-700"
                          : touched || password.length > 0
                            ? "flex items-center gap-2 text-destructive"
                            : "flex items-center gap-2 text-muted-foreground"
                      }
                    >
                      {rule.ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                      {rule.label}
                    </li>
                  ))}
                </ul>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm new password</Label>
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
                  />
                  {confirm.length > 0 && confirm !== password && (
                    <p className="text-xs text-destructive">Passwords do not match.</p>
                  )}
                </div>

                {touched && validationErrors.length > 0 && (
                  <ul className="space-y-1 rounded bg-destructive/10 p-3 text-xs text-destructive">
                    {validationErrors.map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                )}

                <Button
                  type="submit"
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                  disabled={submitting || !canSubmit}
                >
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Update password
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
