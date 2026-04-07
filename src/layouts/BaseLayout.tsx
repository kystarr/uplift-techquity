import { Outlet } from "react-router-dom";
import { Navigation } from "@/components/Navigation";

export const BaseLayout = () => (
  <div className="min-h-screen bg-background">
    <Navigation />
    <main>
      <Outlet />
    </main>
  </div>
);
