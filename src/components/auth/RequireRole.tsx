import { Navigate } from "react-router-dom";
import { useAuth, type UserRole } from "@/contexts/AuthContext";

interface RequireRoleProps {
  role: UserRole;
  children: React.ReactNode;
  fallbackPath?: string;
}

/**
 * Route guard that restricts access based on the user's Cognito role.
 * Renders children if the user's role matches; otherwise redirects.
 */
export function RequireRole({ role, children, fallbackPath = "/" }: RequireRoleProps) {
  const { user, role: userRole, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!user || userRole !== role) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}
