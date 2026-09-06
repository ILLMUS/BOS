import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowRight, Building2, ClipboardList, ListChecks, ShieldCheck, Workflow } from "lucide-react";

const QUESTIONS = [
  { icon: Building2, title: "Your business", text: "Name, niche, location and team size — so the workflow speaks your language." },
  { icon: ListChecks, title: "Your team roles", text: "Tell us who does what, and every step gets an owner automatically." },
  { icon: Workflow, title: "Your steps", text: "We draft the sequence for your niche; rename, reorder or delete anything." },
  { icon: ClipboardList, title: "Your questions", text: "Add the exact information each step must capture — text, files, money, dates." },
];

export default function Home() {
  const { session, orgId } = useAuth();
  const navigate = useNavigate();

  const start = () => {
    if (!session) return navigate("/login");
    if (!orgId) return navigate("/onboarding");
    navigate("/admin/sop");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-14 items-center justify-between border-b border-border px-4 md:px-8">
        <span className="font-heading text-lg font-bold uppercase tracking-wide">SOP Pipeline</span>
        <div className="flex items-center gap-2">
          {session ? (
            <Button variant="ghost" size="sm" asChild><Link to="/dashboard">Dashboard</Link></Button>
          ) : (
            <Button variant="ghost" size="sm" asChild><Link to="/login">Sign in</Link></Button>
          )}
          <Button variant="ghost" size="sm" asChild><Link to="/track">Track a job</Link></Button>
        </div>
      </header>

      <main>
        <section className="border-b border-border bg-primary px-4 py-16 text-primary-foreground md:px-8 md:py-24">
          <div className="mx-auto max-w-3xl">
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-accent">Build your SOP first</p>
            <h1 className="font-heading text-3xl font-bold leading-tight md:text-5xl">
              Answer a few questions. Get a working process for your business.
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-primary-foreground/70 md:text-base">
              No templates to force-fit. The questionnaire builds your steps, owners, deadlines and forms as
              you answer — trades, catering, clinics, logistics, retail, anything.
            </p>
            <Button
              size="lg"
              className="mt-8 bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={start}
            >
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>

        <section className="px-4 py-14 md:px-8">
          <div className="mx-auto max-w-4xl">
            <h2 className="font-heading text-xl font-bold uppercase">What the questionnaire asks</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {QUESTIONS.map((q, i) => (
                <div key={q.title} className="border border-border p-5">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center bg-accent text-accent-foreground">
                    <q.icon className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-mono text-muted-foreground">Step {i + 1}</p>
                  <h3 className="font-heading text-base font-bold">{q.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{q.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-start gap-3 border border-border bg-muted/30 p-5">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <p className="text-sm text-muted-foreground">
                Change your process later and publish a new version — jobs already running keep the exact
                version they started with, so nothing already running breaks.
              </p>
            </div>

            <Button className="mt-8 bg-accent text-accent-foreground hover:bg-accent/90" onClick={start}>
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}