import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface BrandingContextValue {
  logoUrl: string | null;
  reload: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextValue>({ logoUrl: null, reload: async () => undefined });

function hexToHsl(hex: string) {
  const value = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return null;
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { organization } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const reload = async () => {
    if (!organization?.logo_url) {
      setLogoUrl(null);
      return;
    }
    const { data } = await supabase.storage.from("business-branding").createSignedUrl(organization.logo_url, 3600);
    setLogoUrl(data?.signedUrl ?? null);
  };

  useEffect(() => {
    void reload();
  }, [organization?.logo_url]);

  useEffect(() => {
    const root = document.documentElement;
    const primary = organization?.brand_color ? hexToHsl(organization.brand_color) : null;
    const secondary = organization?.brand_secondary_color ? hexToHsl(organization.brand_secondary_color) : null;
    if (primary) {
      root.style.setProperty("--primary", primary);
      root.style.setProperty("--accent", primary);
      root.style.setProperty("--ring", primary);
      root.style.setProperty("--sidebar-primary", primary);
      root.style.setProperty("--sidebar-ring", primary);
      root.style.setProperty("--chart-1", primary);
    } else {
      ["--primary", "--accent", "--ring", "--sidebar-primary", "--sidebar-ring", "--chart-1"].forEach((key) => root.style.removeProperty(key));
    }
    if (secondary) root.style.setProperty("--chart-2", secondary);
    else root.style.removeProperty("--chart-2");
    return () => {
      ["--primary", "--accent", "--ring", "--sidebar-primary", "--sidebar-ring", "--chart-1", "--chart-2"].forEach((key) => root.style.removeProperty(key));
    };
  }, [organization?.brand_color, organization?.brand_secondary_color]);

  return <BrandingContext.Provider value={{ logoUrl, reload }}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  return useContext(BrandingContext);
}