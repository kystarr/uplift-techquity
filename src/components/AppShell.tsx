import { Outlet } from "react-router-dom";
import { Navigation } from "@/components/Navigation";

export function AppShell() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="relative z-10">
        <Outlet />
      </main>
    </div>
  );
}
