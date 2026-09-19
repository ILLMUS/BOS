import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Seamless back navigation: goes to the previous in-app view, or the dashboard. */
export default function BackButton() {
  const navigate = useNavigate();
  const { pathname, key } = useLocation();

  if (pathname === "/dashboard" || pathname === "/") return null;

  const canGoBack = key !== "default" && window.history.length > 1;

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Go back"
      title="Go back"
      className="rounded-xl"
      onClick={() => (canGoBack ? navigate(-1) : navigate("/dashboard"))}
    >
      <ArrowLeft className="h-5 w-5" />
    </Button>
  );
}
