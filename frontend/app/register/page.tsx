"use client";

import React, { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading: authLoading } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address";
    }

    if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      await register(name.trim(), email.trim().toLowerCase(), password);
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409 || err.message.toLowerCase().includes("already")) {
          setError("An account with this email already exists. Try signing in.");
        } else {
          setError(err.message);
        }
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
              Begin Your Journey
            </h1>
            <p className="text-warm-gray-400 text-sm">
              Create your account and start planning the perfect seating arrangement
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
                label="Full Name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors.name) setFieldErrors((f) => ({ ...f, name: "" }));
                }}
                error={fieldErrors.name}
                required
                autoComplete="name"
              />

              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: "" }));
                }}
                error={fieldErrors.email}
                required
                autoComplete="email"
              />

              <Input
                label="Password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password)
                    setFieldErrors((f) => ({ ...f, password: "" }));
                }}
                error={fieldErrors.password}
                required
                autoComplete="new-password"
                hint="Minimum 6 characters"
              />

              <Input
                label="Confirm Password"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirmPassword)
                    setFieldErrors((f) => ({ ...f, confirmPassword: "" }));
                }}
                error={fieldErrors.confirmPassword}
                required
                autoComplete="new-password"
              />

              <Button
                type="submit"
                className="w-full"
                size="lg"
                loading={isSubmitting}
              >
                Create Account
              </Button>
            </form>

            <div className="divider-gold mt-8 mb-6" />

            <p className="text-center text-sm text-warm-gray-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-rose-500 hover:text-rose-600 font-medium transition-colors"
              >
                Sign in
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
