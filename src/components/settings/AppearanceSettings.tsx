import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { Monitor, Moon, Sun, Palette, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: "light" as const, label: "Light", icon: Sun },
    { value: "dark" as const, label: "Dark", icon: Moon },
  ];

  const useSystem = () => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(prefersDark ? "dark" : "light");
  };

  return (
    <Card className="relative w-full min-w-0 overflow-hidden border-white/[0.08] bg-[#05131a]/80 text-white shadow-xl backdrop-blur-md">
      <CardHeader className="border-b border-white/[0.06] p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2.5 text-base font-bold tracking-tight text-white sm:text-lg">
          <motion.div
            whileHover={{ rotate: 180, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-500/10 text-teal-400"
          >
            <Palette className="h-4 w-4" />
          </motion.div>
          <span className="break-words">Appearance</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5 p-4 sm:p-6">
        <div className="space-y-3 min-w-0">
          <Label className="text-xs font-semibold text-slate-300">Theme Preference</Label>

          {/* ANIMATED BUTTON GRID */}
          <div className="grid grid-cols-1 gap-2.5 min-w-0 sm:grid-cols-3">
            {options.map((o) => {
              const isActive = theme === o.value;
              const Icon = o.icon;

              return (
                <motion.div
                  key={o.value}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.02 }}
                  className="relative min-w-0"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTheme(o.value)}
                    aria-pressed={isActive}
                    className={`relative flex w-full items-center justify-between overflow-hidden border-white/[0.1] px-3.5 py-5 text-xs font-semibold transition-colors ${
                      isActive
                        ? "border-teal-400/40 text-teal-200"
                        : "bg-[#02080b]/60 text-slate-400 hover:border-teal-500/20 hover:bg-[#02080b] hover:text-white"
                    }`}
                  >
                    {/* ACTIVE GLOW PILL ANIMATION */}
                    {isActive && (
                      <motion.div
                        layoutId="activeThemeGlow"
                        className="absolute inset-0 bg-gradient-to-r from-teal-500/25 to-emerald-500/15"
                        initial={false}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}

                    <div className="relative z-10 flex items-center gap-2.5 min-w-0">
                      <motion.div
                        animate={{
                          rotate: isActive && o.value === "light" ? 90 : 0,
                          scale: isActive ? [1, 1.25, 1] : 1,
                        }}
                        transition={{ duration: 0.3 }}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-teal-400" : "text-slate-400"}`} />
                      </motion.div>
                      <span className="truncate">{o.label}</span>
                    </div>

                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="relative z-10"
                        >
                          <Check className="h-3.5 w-3.5 text-teal-400" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>
                </motion.div>
              );
            })}

            {/* MATCH SYSTEM BUTTON */}
            <motion.div whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.02 }} className="min-w-0">
              <Button
                variant="outline"
                size="sm"
                onClick={useSystem}
                className="flex w-full items-center justify-start border-white/[0.1] bg-[#02080b]/60 px-3.5 py-5 text-xs font-semibold text-slate-400 hover:border-teal-500/20 hover:bg-[#02080b] hover:text-white"
              >
                <Monitor className="mr-2.5 h-4 w-4 shrink-0 text-slate-400" />
                <span className="truncate">Match system</span>
              </Button>
            </motion.div>
          </div>

          <p className="break-words text-[11px] text-slate-400">
            Your choice is saved on this device and applies across the whole app.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}