import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { FaviconSync } from "@/components/FaviconSync";
import { AuthProvider } from "@/contexts/AuthContext";
import { RequireRole } from "@/components/auth";
import Index from "./pages/Index";
import Search from "./pages/Search";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import Favorites from "./pages/Favorites";
import MessagesInbox from "./pages/MessagesInbox";
import Messages from "./pages/Messages";
import RegisterBusiness from "./pages/RegisterBusiness";
import BusinessProfilePage from "./pages/BusinessProfile";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminFlags from "./pages/admin/AdminFlags";
import AdminBusinesses from "./pages/admin/AdminBusinesses";
import Profile from "./pages/Profile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <FaviconSync />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/search" element={<Search />} />
          <Route path="/auth" element={<Auth />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
            <Route path="/favorites" element={<Favorites />} />
          <Route path="/messages" element={<MessagesInbox />} />
          <Route path="/messages/:businessId" element={<Messages />} />
          <Route path="/register" element={<Navigate to="/register/1" replace />} />
          <Route path="/register/:step" element={<RegisterBusiness />} />
          <Route path="/business/:id" element={<BusinessProfilePage />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:tab" element={<Profile />} />

          {/* Admin routes — requires ADMIN role */}
          <Route path="/admin" element={<RequireRole role="ADMIN"><AdminDashboard /></RequireRole>} />
          <Route path="/admin/flags" element={<RequireRole role="ADMIN"><AdminFlags /></RequireRole>} />
          <Route path="/admin/businesses" element={<RequireRole role="ADMIN"><AdminBusinesses /></RequireRole>} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
