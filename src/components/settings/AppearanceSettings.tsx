import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { Monitor, Moon, Sun, Palette } from "lucide-react";

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Palette className="h-5 w-5 text-accent" />
          Appearance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-2">
          <Label>Theme</Label>
          <div className="flex flex-wrap gap-2">
            {options.map((o) => (
              <Button
                key={o.value}
                variant={theme === o.value ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme(o.value)}
                aria-pressed={theme === o.value}
              >
                <o.icon className="mr-2 h-4 w-4" aria-hidden="true" />
                {o.label}
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={useSystem}>
              <Monitor className="mr-2 h-4 w-4" aria-hidden="true" />
              Match system
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Your choice is saved on this device and applies across the whole app.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}