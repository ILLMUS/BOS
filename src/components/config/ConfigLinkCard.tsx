import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sliders } from "lucide-react";
import { motion } from "framer-motion";

export interface ConfigLink {
  to: string;
  label: string;
  description: string;
}

/** Points at the existing configuration screens instead of duplicating them. */
export default function ConfigLinkCard({
  title,
  description,
  links,
}: {
  title: string;
  description: string;
  links: ConfigLink[];
}) {
  return (
    <div className="relative w-full min-w-0 group">
      {/* MOVING SHADOW / GLOW EFFECT */}
      <motion.div
        animate={{
          x: [-15, 15, -15],
          y: [-8, 8, -8],
          opacity: [0.25, 0.5, 0.25],
          scale: [0.98, 1.02, 0.98],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-teal-500/20 via-emerald-500/10 to-teal-400/25 blur-xl pointer-events-none"
      />

      <Card className="relative w-full min-w-0 overflow-hidden border-white/[0.08] bg-[#05131a]/80 text-white shadow-2xl backdrop-blur-md">
        <CardHeader className="border-b border-white/[0.06] p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2.5 text-base font-bold tracking-tight text-white sm:text-lg min-w-0">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-500/10 text-teal-400"
            >
              <Sliders className="h-4 w-4" />
            </motion.div>
            <span className="truncate">{title}</span>
          </CardTitle>
          <CardDescription className="break-words text-xs text-slate-400 mt-1">
            {description}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 text-xs sm:p-6 sm:text-sm min-w-0 space-y-3">
          {links.map((l) => (
            <div
              key={l.to + l.label}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-3.5 min-w-0 transition-colors hover:border-white/20"
            >
              <div className="min-w-0 space-y-0.5">
                <p className="font-semibold text-white truncate text-xs sm:text-sm">{l.label}</p>
                <p className="break-words text-xs text-slate-400">{l.description}</p>
              </div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="shrink-0 self-end sm:self-auto">
                <Button asChild size="sm" variant="outline" className="h-8 border-white/10 bg-[#030d12] text-xs font-semibold text-slate-200 hover:bg-white/10 hover:text-white">
                  <Link to={l.to}>
                    Open <ArrowRight className="ml-1.5 h-3.5 w-3.5 text-teal-400" />
                  </Link>
                </Button>
              </motion.div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}