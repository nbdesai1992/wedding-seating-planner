"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, ApiError } from "./api";

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
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Mirror token to cookie so Next.js middleware can read it
function syncTokenCookie(token: string | null) {
  if (typeof document === "undefined") return;
  if (token) {
    document.cookie = `auth_token=${token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
  } else {
    document.cookie = "auth_token=; path=/; max-age=0";
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, check for stored token and validate it
  useEffect(() => {
    const storedToken = localStorage.getItem("auth_token");
    if (storedToken) {
      setToken(storedToken);
      syncTokenCookie(storedToken);
      api
        .get<User>("/api/auth/me")
        .then((userData) => {
          setUser(userData);
        })
        .catch(() => {
          // Token is invalid — clear it
          localStorage.removeItem("auth_token");
          syncTokenCookie(null);
          setToken(null);
          setUser(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      syncTokenCookie(null);
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // FastAPI OAuth2 expects form data for token endpoint
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "https://wedding-planner-api-z0l3.onrender.com"}/api/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }
    );

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new ApiError(
        data?.detail || "Invalid email or password",
        res.status,
        data
      );
    }

    const data = await res.json();
    const newToken = data.access_token || data.token;
    localStorage.setItem("auth_token", newToken);
    syncTokenCookie(newToken);
    setToken(newToken);

    // Fetch user profile
    const userData = await api.get<User>("/api/auth/me");
    setUser(userData);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const data = await api.post<{ access_token?: string; token?: string; user?: User }>(
        "/api/auth/register",
        { name, email, password },
        { skipAuth: true }
      );

      const newToken = data.access_token || data.token;
      if (newToken) {
        localStorage.setItem("auth_token", newToken);
        syncTokenCookie(newToken);
        setToken(newToken);

        // Fetch user profile
        const userData = await api.get<User>("/api/auth/me");
        setUser(userData);
      }
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    syncTokenCookie(null);
    setToken(null);
    setUser(null);
    window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
