import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Menu, Moon, Sun, Building2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationPanel from "./NotificationPanel";
import BackButton from "./BackButton";
import { useTheme } from "@/hooks/useTheme";
import { ROUTE_TITLES } from "@/lib/modules";

interface AppHeaderProps {
  onMenuToggle?: () => void;
}

export default function AppHeader({ onMenuToggle }: AppHeaderProps) {
  const { profile, signOut, organization } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const match =
    [...ROUTE_TITLES]
      .sort((a, b) => b.path.length - a.path.length)
      .find((r) => pathname === r.path || pathname.startsWith(`${r.path}/`)) ?? null;

  const firstName = (profile?.full_name || "").split(" ")[0];
  const subtitle =
    match?.path === "/dashboard" && firstName
      ? `Welcome back, ${firstName}. Here's what's happening in ${organization?.name ?? "your workspace"}.`
      : match?.subtitle ?? "";

  const initials = (profile?.full_name || "U")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex min-h-16 items-center justify-between gap-4 bg-background px-4 py-3 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuToggle}>
          <Menu className="h-5 w-5" />
        </Button>
        <BackButton />
        <div className="min-w-0">
          <h1 className="truncate font-heading text-xl font-bold tracking-tight md:text-[22px]">
            {match?.title ?? organization?.name ?? "Workspace"}
          </h1>
          {subtitle && <p className="truncate text-[13px] text-muted-foreground">{subtitle}</p>}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-[13px] font-medium md:flex">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="max-w-[160px] truncate">{organization?.name ?? "Workspace"}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </div>

        <NotificationPanel />

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="rounded-xl focus-visible:ring-2 focus-visible:ring-ring"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
        </Button>

        <Button variant="ghost" size="icon" onClick={signOut} title="Sign out" className="rounded-xl">
          <LogOut className="h-4 w-4" />
        </Button>

        <button
          type="button"
          onClick={() => navigate("/settings")}
          title={`${profile?.full_name ?? "Profile"} — edit profile`}
          aria-label="Edit your profile"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-ring"
        >
          {initials}
        </button>
      </div>
    </header>
  );
}
