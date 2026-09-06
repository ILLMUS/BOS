import { Suspense, useState } from "react";
import { Outlet } from "react-router-dom";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";
import AuthorityGate from "@/components/AuthorityGate";
import PageSkeleton from "@/components/ui/page-skeleton";
import { useAccessWatch } from "@/hooks/useAccessWatch";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Tells the member as soon as a missing workspace link or role is granted.
  useAccessWatch();


  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      {/* Edge gradient glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{ background: "var(--edge-glow)" }}
        aria-hidden="true"
      />

      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((p) => !p)}
      />
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <AppHeader onMenuToggle={() => setSidebarOpen((p) => !p)} />
        <main className="thin-scroll flex-1 overflow-y-auto px-4 pb-6 md:px-6">
          <AuthorityGate>
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </AuthorityGate>
        </main>
      </div>
    </div>
  );
}
