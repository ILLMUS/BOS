import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessPath, diagnoseAccess } from "@/lib/authority";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Lock, ArrowRight, BellRing, Send, Loader2 } from "lucide-react";
import { AUTHORITY_LABELS } from "@/lib/authority";
import { rememberBlockedPath } from "@/lib/accessWatch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Enforces the workspace chain of command on every route: a member can only
 * open sections their standing allows. Authority is delegated downward from
 * the Super Admin, so anything above your level is closed, not merely hidden.
 */
export default function AuthorityGate({ children }: { children: React.ReactNode }) {
  const { authority, roles, orgId, organization, user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const allowed = canAccessPath(authority, pathname);
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);

  // Remember the locked section so the app can notify the member the moment
  // the missing workspace link or role assignment is granted.
  useEffect(() => {
    if (!allowed && user) {
      const label = pathname.split("/").filter(Boolean).join(" / ") || "Dashboard";
      rememberBlockedPath(user.id, pathname, label);
    }
  }, [allowed, user, pathname]);

  if (allowed) return <>{children}</>;

  const diagnostic = diagnoseAccess({
    path: pathname,
    authority,
    roles,
    orgId,
    orgName: organization?.name,
  });

  const isWorkspaceIssue = diagnostic.code === "no_workspace_link";

  const label = pathname.split("/").filter(Boolean).join(" / ") || "Dashboard";

  const requestAccess = async () => {
    setRequesting(true);
    const { error } = await supabase.rpc("request_access", {
      _path: pathname,
      _label: label,
      _required: diagnostic.required,
      _note: null,
    });
    setRequesting(false);
    if (error) {
      toast.error(error.message || "Could not send the request");
      return;
    }
    setRequested(true);
    toast.success("Request sent", {
      description: "Your workspace administrators can now grant this section.",
    });
  };


  return (
    <div className="mx-auto max-w-xl py-16">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-lg">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            {isWorkspaceIssue ? "No workspace yet" : "Outside your authority"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-foreground">{diagnostic.reason}</p>

          {diagnostic.missingRoles.length > 0 && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <span className="font-medium text-foreground">Unlocking roles: </span>
              <span className="text-muted-foreground">{diagnostic.missingRoles.join(", ")}</span>
            </div>
          )}

          <p className="text-sm text-muted-foreground">{diagnostic.nextStep}</p>

          <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-xs text-muted-foreground">
            <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              We are watching this section for you — you will get an in-app notification the
              moment your {isWorkspaceIssue ? "workspace link" : "role assignment"} is granted.
            </span>
          </div>

          <Button
            className="w-full"
            variant="secondary"
            disabled={requesting || requested}
            onClick={requestAccess}
          >
            {requesting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {requested ? "Request sent to your administrators" : "Request access to this section"}
          </Button>





          {/* Direct link to the locked section — it opens as soon as access is granted */}
          <div className="flex items-center justify-between rounded-md border border-dashed border-border p-3">
            <div className="flex items-center gap-2 text-sm">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">
                  Unlocks at {AUTHORITY_LABELS[diagnostic.required]} standing
                </p>
                <p className="text-xs text-muted-foreground">{pathname}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate(pathname)}>
              Open section
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {isWorkspaceIssue ? (
              <>
                <Button onClick={() => navigate("/onboarding")}>Set up my workspace</Button>
                <Button variant="outline" onClick={() => navigate("/settings")}>
                  Account settings
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => navigate("/dashboard")}>
                  Go to dashboard
                </Button>
                <Button onClick={() => navigate("/jobs")}>My assigned work</Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

