import { useEffect, useRef, useState } from "react";
import { Eye, ImagePlus, Loader2, RotateCcw, Save, Trash2, Palette, Upload, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BrandingPreviewDialog from "@/components/config/BrandingPreviewDialog";
import { motion, AnimatePresence } from "framer-motion";

const HEX = /^#[0-9a-f]{6}$/i;

export default function BusinessBrandingCard() {
  const { orgId, organization, refreshProfile } = useAuth();
  const { logoUrl, reload } = useBranding();
  const inputRef = useRef<HTMLInputElement>(null);
  const [primary, setPrimary] = useState(organization?.brand_color ?? "#F97316");
  const [secondary, setSecondary] = useState(organization?.brand_secondary_color ?? "#16A34A");
  const [draftLogoFile, setDraftLogoFile] = useState<File | null>(null);
  const [draftLogoUrl, setDraftLogoUrl] = useState<string | null>(null);
  const [removeSavedLogo, setRemoveSavedLogo] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPrimary(organization?.brand_color ?? "#F97316");
    setSecondary(organization?.brand_secondary_color ?? "#16A34A");
  }, [organization?.brand_color, organization?.brand_secondary_color]);

  useEffect(() => () => {
    if (draftLogoUrl) URL.revokeObjectURL(draftLogoUrl);
  }, [draftLogoUrl]);

  const visibleLogoUrl = removeSavedLogo ? null : draftLogoUrl ?? logoUrl;
  const savedPrimary = organization?.brand_color ?? "#F97316";
  const savedSecondary = organization?.brand_secondary_color ?? "#16A34A";
  const hasChanges = primary !== savedPrimary || secondary !== savedSecondary || draftLogoFile !== null || removeSavedLogo;

  const resetDraft = () => {
    setPrimary(savedPrimary);
    setSecondary(savedSecondary);
    setDraftLogoFile(null);
    setDraftLogoUrl(null);
    setRemoveSavedLogo(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const publishBrand = async () => {
    if (!orgId || !HEX.test(primary) || !HEX.test(secondary)) return toast.error("Enter valid six-digit colour values");
    setBusy(true);
    let newPath: string | null = null;
    if (draftLogoFile) {
      const extension = draftLogoFile.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
      newPath = `${orgId}/logo-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("business-branding").upload(newPath, draftLogoFile, { contentType: draftLogoFile.type });
      if (uploadError) {
        setBusy(false);
        return toast.error(uploadError.message);
      }
    }
    const oldPath = organization?.logo_url ?? null;
    const nextLogoPath = removeSavedLogo ? null : newPath ?? oldPath;
    const { error } = await supabase.from("organizations").update({
      brand_color: primary,
      brand_secondary_color: secondary,
      logo_url: nextLogoPath,
    }).eq("id", orgId);
    if (error) {
      if (newPath) await supabase.storage.from("business-branding").remove([newPath]);
      setBusy(false);
      return toast.error(error.message);
    }
    if (oldPath && oldPath !== nextLogoPath) await supabase.storage.from("business-branding").remove([oldPath]);
    await refreshProfile();
    await reload();
    setDraftLogoFile(null);
    setDraftLogoUrl(null);
    setRemoveSavedLogo(false);
    setBusy(false);
    toast.success("Branding published to your workspace");
  };

  const chooseLogo = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Choose an image file");
    if (file.size > 5 * 1024 * 1024) return toast.error("Logo must be smaller than 5 MB");
    setDraftLogoFile(file);
    setDraftLogoUrl(URL.createObjectURL(file));
    setRemoveSavedLogo(false);
  };

  const removeLogo = () => {
    setDraftLogoFile(null);
    setDraftLogoUrl(null);
    setRemoveSavedLogo(Boolean(organization?.logo_url));
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <Card className="relative w-full min-w-0 overflow-hidden border-white/[0.08] bg-[#05131a]/80 text-white shadow-xl backdrop-blur-md">
      <CardHeader className="border-b border-white/[0.06] p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2.5 text-base font-bold tracking-tight text-white sm:text-lg">
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-500/10 text-teal-400"
          >
            <Palette className="h-4 w-4" />
          </motion.div>
          <span className="break-words">Brand identity</span>
        </CardTitle>
        <CardDescription className="break-words text-xs text-slate-400">
          Preview changes across key screens before publishing them to your team.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 p-4 text-xs sm:p-6 sm:text-sm">
        {/* LOGO SECTION */}
        <div className="rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-4 space-y-3 min-w-0">
          <p className="font-semibold text-slate-200">Company Logo</p>
          <div className="flex flex-wrap items-center gap-4 min-w-0">
            <div className="relative flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-[#030d12]/80 p-2 shadow-inner">
              {visibleLogoUrl ? (
                <img
                  src={visibleLogoUrl}
                  alt={`${organization?.name ?? "Business"} logo`}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <ImagePlus className="h-7 w-7 text-slate-600" />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <Input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(event) => chooseLogo(event.target.files?.[0])}
              />
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => inputRef.current?.click()}
                  disabled={busy}
                  className="h-8 border-white/10 bg-white/5 text-xs text-slate-300 hover:bg-white/10 hover:text-white"
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5 text-teal-400" />
                  Upload logo
                </Button>
              </motion.div>

              {visibleLogoUrl && (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={removeLogo}
                    disabled={busy}
                    aria-label="Remove logo"
                    className="h-8 w-8 border-rose-500/20 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 hover:text-rose-200"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* COLOUR PALETTE SECTION */}
        <div className="grid gap-4 sm:grid-cols-2 min-w-0">
          <div className="rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-4 space-y-2 min-w-0">
            <Label htmlFor="brand-primary" className="text-xs font-semibold text-slate-300">
              Primary colour
            </Label>
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative h-9 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10">
                <Input
                  id="brand-primary-picker"
                  type="color"
                  value={primary}
                  onChange={(e) => setPrimary(e.target.value)}
                  className="absolute -inset-2 h-14 w-16 cursor-pointer border-0 bg-transparent p-0"
                  aria-label="Choose primary colour"
                />
              </div>
              <Input
                id="brand-primary"
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
                className="w-full border-white/[0.1] bg-[#030d12]/80 font-mono text-xs text-white focus:border-teal-400/50"
              />
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-4 space-y-2 min-w-0">
            <Label htmlFor="brand-secondary" className="text-xs font-semibold text-slate-300">
              Secondary colour
            </Label>
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative h-9 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10">
                <Input
                  id="brand-secondary-picker"
                  type="color"
                  value={secondary}
                  onChange={(e) => setSecondary(e.target.value)}
                  className="absolute -inset-2 h-14 w-16 cursor-pointer border-0 bg-transparent p-0"
                  aria-label="Choose secondary colour"
                />
              </div>
              <Input
                id="brand-secondary"
                value={secondary}
                onChange={(e) => setSecondary(e.target.value)}
                className="w-full border-white/[0.1] bg-[#030d12]/80 font-mono text-xs text-white focus:border-teal-400/50"
              />
            </div>
          </div>
        </div>

        {/* ACTIONS & FOOTER */}
        <div className="space-y-3 border-t border-white/[0.06] pt-4 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreviewOpen(true)}
                disabled={!HEX.test(primary) || !HEX.test(secondary)}
                className="h-8 border-white/10 bg-white/5 text-xs text-slate-300 hover:bg-white/10 hover:text-white"
              >
                <Eye className="mr-1.5 h-3.5 w-3.5 text-teal-400" />
                Preview screens
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="button"
                size="sm"
                onClick={() => void publishBrand()}
                disabled={busy || !hasChanges}
                className="h-8 bg-teal-500 text-xs font-semibold text-slate-950 hover:bg-teal-400 disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                )}
                Publish branding
              </Button>
            </motion.div>

            <AnimatePresence>
              {hasChanges && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetDraft}
                    disabled={busy}
                    className="h-8 text-xs text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    Discard changes
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p className="break-words text-xs text-slate-400">
            Changes stay private until you publish them.
          </p>
        </div>
      </CardContent>

      <BrandingPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        businessName={organization?.name ?? "Your business"}
        logoUrl={visibleLogoUrl}
        primary={primary}
        secondary={secondary}
      />
    </Card>
  );
}