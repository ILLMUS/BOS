import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {links.map((l) => (
          <div key={l.to + l.label} className="flex items-center justify-between gap-3 rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">{l.label}</p>
              <p className="text-xs text-muted-foreground">{l.description}</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to={l.to}>
                Open <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}