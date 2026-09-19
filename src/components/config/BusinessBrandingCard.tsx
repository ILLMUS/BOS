import { useEffect, useRef, useState } from "react";
import { Eye, ImagePlus, Loader2, RotateCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BrandingPreviewDialog from "@/components/config/BrandingPreviewDialog";

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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Brand identity</CardTitle>
        <CardDescription>Preview changes across key screens before publishing them to your team.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-20 w-28 items-center justify-center overflow-hidden rounded border border-border bg-muted">
            {visibleLogoUrl ? <img src={visibleLogoUrl} alt={`${organization?.name ?? "Business"} logo`} className="max-h-full max-w-full object-contain p-2" /> : <ImagePlus className="h-7 w-7 text-muted-foreground" />}
          </div>
          <div className="flex gap-2">
            <Input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(event) => chooseLogo(event.target.files?.[0])} />
            <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}><ImagePlus className="mr-2 h-4 w-4" />Upload logo</Button>
            {visibleLogoUrl && <Button variant="outline" size="icon" onClick={removeLogo} disabled={busy} aria-label="Remove logo"><Trash2 className="h-4 w-4" /></Button>}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="brand-primary">Primary colour</Label>
            <div className="flex gap-2"><Input id="brand-primary-picker" type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="h-10 w-14 p-1" aria-label="Choose primary colour" /><Input id="brand-primary" value={primary} onChange={(e) => setPrimary(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand-secondary">Secondary colour</Label>
            <div className="flex gap-2"><Input id="brand-secondary-picker" type="color" value={secondary} onChange={(e) => setSecondary(e.target.value)} className="h-10 w-14 p-1" aria-label="Choose secondary colour" /><Input id="brand-secondary" value={secondary} onChange={(e) => setSecondary(e.target.value)} /></div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={() => setPreviewOpen(true)} disabled={!HEX.test(primary) || !HEX.test(secondary)}><Eye className="mr-2 h-4 w-4" />Preview screens</Button>
          <Button onClick={() => void publishBrand()} disabled={busy || !hasChanges}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Publish branding</Button>
          {hasChanges && <Button variant="ghost" onClick={resetDraft} disabled={busy}><RotateCcw className="mr-2 h-4 w-4" />Discard changes</Button>}
          <p className="w-full text-xs text-muted-foreground">Changes stay private until you publish them.</p>
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