"use client";

import React, { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-rose-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      {/* Decorative top bar */}
      <div className="h-1 bg-gradient-to-r from-rose-200 via-gold-400 to-rose-200" />

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo + Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-rose-100 mb-5">
              <Heart className="w-7 h-7 text-rose-400" fill="currentColor" />
            </div>
            <h1 className="text-3xl font-serif font-semibold text-warm-gray-800 mb-2">
              Welcome Back
            </h1>
            <p className="text-warm-gray-400 text-sm">
              Sign in to continue planning your perfect day
            </p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-card shadow-card border border-cream-200 p-8">
            {/* Gold divider */}
            <div className="divider-gold mb-8" />

            {error && (
              <div className="mb-6 px-4 py-3 rounded-soft bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />

              <Button
                type="submit"
                className="w-full"
                size="lg"
                loading={isSubmitting}
              >
                Sign In
              </Button>
            </form>

            <div className="divider-gold mt-8 mb-6" />

            <p className="text-center text-sm text-warm-gray-400">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="text-rose-500 hover:text-rose-600 font-medium transition-colors"
              >
                Create one
              </Link>
            </p>
          </div>

          {/* Footer */}
          <p className="text-center mt-8 text-xs text-warm-gray-400">
            Seated — Your wedding, beautifully arranged
          </p>
        </div>
      </div>
    </div>
  );
}
