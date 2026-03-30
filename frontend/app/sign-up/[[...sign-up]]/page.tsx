"use client";

import { SignUp } from "@clerk/nextjs";
import { Heart } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      {/* Decorative top bar */}
      <div className="h-1 bg-gradient-to-r from-rose-200 via-gold-400 to-rose-200" />

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo + Header */}
          <div className="text-center mb-8">
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

          {/* Gold divider */}
          <div className="divider-gold mb-8" />

          {/* Clerk SignUp component */}
          <div className="flex justify-center">
            <SignUp
              fallbackRedirectUrl="/dashboard"
              signInUrl="/sign-in"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "w-full shadow-none border-0 bg-transparent p-0",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  socialButtonsBlockButton:
                    "border border-cream-200 hover:bg-cream-100 text-warm-gray-600 rounded-soft",
                  dividerLine: "bg-cream-200",
                  dividerText: "text-warm-gray-400 text-xs",
                  formFieldInput:
                    "border-cream-200 rounded-soft focus:border-rose-400 focus:ring-2 focus:ring-rose-400/25 bg-white text-warm-gray-800 placeholder:text-warm-gray-300",
                  formFieldLabel: "text-warm-gray-600 font-medium text-sm",
                  formButtonPrimary:
                    "bg-rose-400 hover:bg-rose-500 active:bg-rose-600 text-white rounded-soft shadow-none font-medium py-2.5",
                  footerActionLink:
                    "text-rose-500 hover:text-rose-600 font-medium",
                  identityPreviewEditButton: "text-rose-500 hover:text-rose-600",
                  formFieldAction: "text-rose-500 hover:text-rose-600",
                  footer: "hidden",
                },
              }}
            />
          </div>

          {/* Gold divider */}
          <div className="divider-gold mt-8 mb-6" />

          {/* Footer link */}
          <p className="text-center text-sm text-warm-gray-400">
            Already have an account?{" "}
            <a
              href="/sign-in"
              className="text-rose-500 hover:text-rose-600 font-medium transition-colors"
            >
              Sign in
            </a>
          </p>

          {/* Tagline */}
          <p className="text-center mt-8 text-xs text-warm-gray-400">
            Seated — Your wedding, beautifully arranged
          </p>
        </div>
      </div>
    </div>
  );
}
