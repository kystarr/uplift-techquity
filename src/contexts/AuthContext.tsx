import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getCurrentUser, signOut as amplifySignOut, fetchAuthSession } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";

type AuthUser = Awaited<ReturnType<typeof getCurrentUser>> | null;
export type UserRole = "ADMIN" | "OWNER" | "CUSTOMER" | null;

type AuthContextValue = {
  user: AuthUser;
  role: UserRole;
  isLoading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1];
    if (!base64) return null;
    return JSON.parse(atob(base64.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const u = await getCurrentUser();
      setUser(u);

      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();
      if (idToken) {
        const claims = decodeJwtPayload(idToken);
        const tokenRole = (claims?.['custom:role'] as string) || null;
        setRole(tokenRole as UserRole);
      } else {
        setRole(null);
      }
    } catch {
      setUser(null);
      setRole(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    const cancel = Hub.listen("auth", ({ payload }) => {
      switch (payload.event) {
        case "signedIn":
        case "tokenRefresh":
          refreshUser();
          break;
        case "signedOut":
        case "signOutWithUserAgent":
          setUser(null);
          setRole(null);
          break;
        default:
          break;
      }
    });
    return () => cancel();
  }, [refreshUser]);

  const signOut = useCallback(async () => {
    try {
      await amplifySignOut();
    } catch {
      // proceed regardless
    } finally {
      setUser(null);
      setRole(null);
    }
  }, []);

  const isAdmin = role === "ADMIN";

  return (
    <AuthContext.Provider value={{ user, role, isLoading, isAdmin, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
