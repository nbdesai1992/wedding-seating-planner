"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { setTokenGetter } from "@/lib/api";

/**
 * Wires Clerk's getToken() into the API client so all fetch calls
 * automatically include the current session token.
 *
 * Uses a ref to hold the latest getToken so the token getter registered
 * with the API client always calls the current version without re-running
 * the effect (which would cause re-renders during auth hydration).
 */
export function AuthTokenProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  useEffect(() => {
    setTokenGetter(() => getTokenRef.current());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}
