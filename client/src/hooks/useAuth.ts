/**
 * useAuth — Auth hook that returns current user state.
 * Since this is an internal tool without OAuth login flow,
 * we use the owner info from the server environment.
 * The /api/auth/me endpoint returns the owner's identity.
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
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            setUser(data.user);
          }
        }
      } catch {
        // Not authenticated — that's fine for an internal tool
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const logout = () => {
    setUser(null);
    window.location.href = "/";
  };

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    logout,
  };
}
