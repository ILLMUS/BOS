import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Menu, Moon, Sun, Building2, ChevronDown, Search, Radio, ExternalLink, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationPanel from "./NotificationPanel";
import BackButton from "./BackButton";
import { useTheme } from "@/hooks/useTheme";
import { ROUTE_TITLES } from "@/lib/modules";
import { useCopy } from "@/contexts/CopyContext";
import { useBranding } from "@/contexts/BrandingContext";
import { motion, AnimatePresence } from "framer-motion";

interface AppHeaderProps {
  onMenuToggle?: () => void;
}

export default function AppHeader({ onMenuToggle }: AppHeaderProps) {
  const { profile, signOut, organization } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { phrase } = useCopy();
  const { logoUrl } = useBranding();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Search autocomplete state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const match =
    [...ROUTE_TITLES]
      .sort((a, b) => b.path.length - a.path.length)
      .find((r) => pathname === r.path || pathname.startsWith(`${r.path}/`)) ?? null;

  const firstName = (profile?.full_name || "").split(" ")[0];
  const subtitle =
    match?.path === "/dashboard" && firstName
      ? `Welcome back, ${firstName}. Workspace active.`
      : phrase(match?.subtitle ?? "");

  const initials = (profile?.full_name || "U")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Filter routes based on query
  const filteredRoutes = ROUTE_TITLES.filter((r) => {
    const titleText = phrase(r.title).toLowerCase();
    const pathText = r.path.toLowerCase();
    const query = searchQuery.toLowerCase();
    return titleText.includes(query) || pathText.includes(query);
  }).slice(0, 6); // Limit results for a clean dropdown

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectRoute = (path: string) => {
    navigate(path);
    setSearchQuery("");
    setIsSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-white/[0.055] bg-[#080c11]/90 px-4 backdrop-blur-md md:px-6">
      {/* LEFT SECTION: NAVIGATION & TITLE */}
      <div className="flex min-w-0 items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg border border-white/[0.07] bg-white/[0.02] text-slate-400 hover:border-cyan-400/20 hover:bg-cyan-400/[0.05] hover:text-cyan-300 xl:hidden"
          onClick={onMenuToggle}
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </Button>

        <BackButton />

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-sm font-semibold tracking-wide text-white md:text-base">
              {match ? phrase(match.title) : organization?.name ?? "Workspace"}
            </h1>
            <span className="hidden items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-400 sm:inline-flex">
              <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-400" />
              Live
            </span>
          </div>

          {subtitle && (
            <p className="truncate text-[10px] text-slate-500">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* CENTER SECTION: COMMAND SEARCH BAR WITH AUTOCOMPLETE */}
      <div className="hidden max-w-xs flex-1 items-center md:flex relative" ref={searchRef}>
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            placeholder="Search pages, navigation..."
            className="h-8 w-full rounded-lg border border-white/[0.075] bg-[#10151d] pl-8 pr-3 text-[11px] text-slate-300 placeholder-slate-600 outline-none transition focus:border-cyan-400/30 focus:bg-[#121824] focus:ring-1 focus:ring-cyan-400/30"
          />
        </div>

        {/* AUTOCOMPLETE DROPDOWN */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 top-10 z-50 overflow-hidden rounded-xl border border-white/10 bg-[#0d131d] shadow-2xl backdrop-blur-xl"
            >
              <div className="p-2 border-b border-white/[0.06] flex items-center justify-between text-[10px] text-slate-400 px-3">
                <span>Available Pages</span>
                <span className="text-cyan-400">{filteredResultsCount => filteredRoutes.length} found</span>
              </div>
              <div className="max-h-64 overflow-y-auto p-1.5 space-y-1">
                {filteredRoutes.length > 0 ? (
                  filteredRoutes.map((route) => (
                    <button
                      key={route.path}
                      onClick={() => handleSelectRoute(route.path)}
                      className="w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-300 transition group"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate group-hover:text-cyan-300">{phrase(route.title)}</p>
                        <p className="text-[10px] text-slate-500 truncate">{route.path}</p>
                      </div>
                      <ArrowRight className="h-3 w-3 text-slate-600 group-hover:text-cyan-400 shrink-0 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No matching pages found for "{searchQuery}"
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* RIGHT SECTION: ACTIONS & PROFILE */}
      <div className="flex shrink-0 items-center gap-2">
        {/* ORGANIZATION PILL */}
        <div className="hidden items-center gap-2 rounded-lg border border-white/[0.075] bg-[#10151d] px-2.5 py-1.5 text-[11px] font-medium text-slate-300 transition hover:border-white/15 md:flex">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-4 w-4 object-contain" />
          ) : (
            <Building2 className="h-3.5 w-3.5 text-cyan-400" />
          )}
          <span className="max-w-[140px] truncate">{organization?.name ?? "Workspace"}</span>
          <ChevronDown className="h-3 w-3 text-slate-500" />
        </div>

        {/* NOTIFICATIONS */}
        <div className="relative">
          <NotificationPanel />
        </div>

        {/* THEME TOGGLE */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="h-8 w-8 rounded-lg border border-white/[0.075] bg-[#10151d] text-slate-400 hover:border-cyan-400/20 hover:bg-cyan-400/[0.05] hover:text-cyan-300"
        >
          {theme === "dark" ? (
            <Sun className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
          ) : (
            <Moon className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
          )}
        </Button>

        {/* SIGN OUT */}
        <Button
          variant="ghost"
          size="icon"
          onClick={signOut}
          title="Sign out"
          className="h-8 w-8 rounded-lg border border-white/[0.075] bg-[#10151d] text-slate-400 hover:border-rose-500/20 hover:bg-rose-500/[0.05] hover:text-rose-400"
        >
          <LogOut className="h-3.5 w-3.5" />
        </Button>

        {/* PROFILE AVATAR */}
        <button
          type="button"
          onClick={() => navigate("/settings")}
          title={`${profile?.full_name ?? "Profile"} — edit profile`}
          aria-label="Edit your profile"
          className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-500/10 text-[10px] font-bold text-cyan-300 transition hover:border-cyan-400/60 hover:bg-cyan-500/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
        >
          {initials}
          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[#080c11] bg-emerald-400" />
        </button>
      </div>
    </header>
  );
}