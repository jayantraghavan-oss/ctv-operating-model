/**
 * useAuth — Simple auth hook that returns current user state.
 * Since the _core auth files weren't created by the feature upgrade,
 * this provides a lightweight implementation that checks for a session cookie.
 */
import { useState, useEffect } from "react";

interface User {
  name: string;
  email?: string;
  role?: string;
  openId?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  logout: () => void;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Try to get user info from the auth endpoint
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/trpc/auth.me", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          const result = data?.result?.data;
          if (result?.user) {
            setUser(result.user);
          }
        }
      } catch {
        // Not authenticated — that's fine
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const logout = () => {
    // Clear session and redirect
    fetch("/api/trpc/auth.logout", { method: "POST", credentials: "include" })
      .then(() => {
        setUser(null);
        window.location.href = "/";
      })
      .catch(() => {
        setUser(null);
        window.location.href = "/";
      });
  };

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    logout,
  };
}
