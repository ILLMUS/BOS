import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface LinkedItem {
  to: string;
  label: string;
  description: string;
}

interface ModulePlaceholderProps {
  title: string;
  summary: string;
  planned: string[];
  linked?: LinkedItem[];
}

export default function ModulePlaceholder({
  title,
  summary,
  planned,
  linked = [],
}: ModulePlaceholderProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{summary}</p>
        </div>
        <Badge variant="outline" className="shrink-0 uppercase tracking-wide">
          Phase 1
        </Badge>
      </div>

      {linked.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Available now</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {linked.map((l) => (
              <div key={l.to} className="flex items-center justify-between gap-3 rounded border p-3">
                <div>
                  <p className="font-medium">{l.label}</p>
                  <p className="text-xs text-muted-foreground">{l.description}</p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link to={l.to}>Open</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Coming in a later phase</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {planned.map((p) => (
              <li key={p} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}