"use client";

import { useUser, useAuth as useClerkAuth, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  getToken: () => Promise<string | null>;
}

/**
 * useAuth() — Thin wrapper around Clerk hooks.
 * Maintains the same interface as the old custom auth context so existing
 * consumers (dashboard, etc.) continue working without changes.
 */
export function useAuth(): AuthContextValue {
  const { user: clerkUser, isLoaded: userLoaded } = useUser();
  const { getToken, isLoaded: authLoaded } = useClerkAuth();
  const { signOut } = useClerk();
  const router = useRouter();

  const isLoading = !userLoaded || !authLoaded;

  const user: User | null = useMemo(() => {
    if (!clerkUser) return null;
    return {
      id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress ?? "",
      name: clerkUser.fullName ?? clerkUser.firstName ?? "",
    };
  }, [clerkUser]);

  // These are no-ops — Clerk handles login/register via its own UI components.
  // Kept for backward compatibility with the interface.
  const login = useCallback(async () => {
    router.push("/sign-in");
  }, [router]);

  const register = useCallback(async () => {
    router.push("/sign-up");
  }, [router]);

  const logout = useCallback(() => {
    signOut({ redirectUrl: "/sign-in" });
  }, [signOut]);

  const getTokenFn = useCallback(async () => {
    return getToken();
  }, [getToken]);

  return {
    user,
    token: null, // Token is fetched async via getToken() — not stored in state
    isLoading,
    login,
    register,
    logout,
    getToken: getTokenFn,
  };
}

// Re-export for backward compat — AuthProvider is now ClerkProvider in layout.tsx
// This is a passthrough so existing imports don't break
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
