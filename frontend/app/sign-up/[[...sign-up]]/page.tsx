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
                variables: {
                  colorPrimary: "#E8B4B8",
                  colorText: "#3D3535",
                  colorTextSecondary: "#6B5B5B",
                  colorInputText: "#3D3535",
                  colorInputBackground: "#FFFFFF",
                  colorBackground: "transparent",
                  borderRadius: "8px",
                  fontFamily: "Inter, system-ui, sans-serif",
                  fontSize: "14px",
                },
                elements: {
                  rootBox: {
                    width: "100%",
                  },
                  card: {
                    width: "100%",
                    boxShadow: "none",
                    border: "0",
                    background: "transparent",
                    padding: "0",
                  },
                  headerTitle: {
                    display: "none",
                  },
                  headerSubtitle: {
                    display: "none",
                  },
                  socialButtonsBlockButton: {
                    border: "1px solid #F5F0EB",
                    borderRadius: "8px",
                    color: "#6B5B5B",
                    background: "transparent",
                  },
                  dividerLine: {
                    background: "#F5F0EB",
                  },
                  dividerText: {
                    color: "#8B7D7D",
                    fontSize: "12px",
                  },
                  formFieldInput: {
                    border: "1px solid #F5F0EB",
                    borderRadius: "8px",
                    color: "#3D3535",
                    background: "#FFFFFF",
                  },
                  formFieldLabel: {
                    color: "#6B5B5B",
                    fontWeight: "500",
                    fontSize: "13px",
                  },
                  formButtonPrimary: {
                    background: "#E8B4B8",
                    borderRadius: "8px",
                    boxShadow: "none",
                    fontWeight: "500",
                    padding: "10px 0",
                    color: "#FFFFFF",
                  },
                  footerActionLink: {
                    color: "#D4949A",
                    fontWeight: "500",
                  },
                  identityPreviewEditButton: {
                    color: "#D4949A",
                  },
                  formFieldAction: {
                    color: "#D4949A",
                  },
                  footer: {
                    display: "none",
                  },
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
