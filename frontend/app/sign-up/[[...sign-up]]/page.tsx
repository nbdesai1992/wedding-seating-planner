"use client";

import { SignUp } from "@clerk/nextjs";
import { Heart } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="auth-page min-h-screen flex flex-col bg-cream-100 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-rose-50 opacity-60 blur-3xl -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-gold-300 opacity-15 blur-3xl translate-y-1/2 translate-x-1/4" />
      </div>

      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-rose-300 via-gold-400 to-rose-300 relative z-10" />

      <div className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        <div className="w-full max-w-[420px]">
          {/* Unified auth card */}
          <div className="bg-white rounded-2xl shadow-card-hover px-8 pt-10 pb-8">
            {/* Logo + Header */}
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-rose-100 to-rose-200 mb-4 shadow-rose-glow">
                <Heart className="w-6 h-6 text-rose-500" fill="currentColor" />
              </div>
              <h1 className="text-2xl font-serif font-semibold text-warm-gray-800 mb-1.5">
                Begin Your Journey
              </h1>
              <p className="text-warm-gray-400 text-sm">
                Create your account and start planning the perfect seating arrangement
              </p>
            </div>

            {/* Divider */}
            <div className="divider-gold mb-4" />

            {/* Clerk SignUp component */}
            <div className="w-full">
              <SignUp
                fallbackRedirectUrl="/dashboard"
                signInUrl="/sign-in"
                appearance={{
                  variables: {
                    colorPrimary: "#C4848A",
                    colorText: "#3D3535",
                    colorTextSecondary: "#6B5B5B",
                    colorInputText: "#3D3535",
                    colorInputBackground: "#FFFFFF",
                    colorBackground: "transparent",
                    borderRadius: "10px",
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
                      border: "none",
                      background: "transparent",
                      padding: "0",
                      margin: "0",
                    },
                    cardBox: {
                      boxShadow: "none",
                      border: "none",
                      background: "transparent",
                    },
                    main: {
                      gap: "12px",
                    },
                    headerTitle: {
                      display: "none",
                    },
                    headerSubtitle: {
                      display: "none",
                    },
                    socialButtonsBlockButton: {
                      border: "1px solid #EDE5DD",
                      borderRadius: "10px",
                      color: "#3D3535",
                      background: "#FFFFFF",
                      fontWeight: "500",
                      padding: "10px 16px",
                      transition: "all 0.15s ease",
                    },
                    socialButtonsBlockButtonText: {
                      fontSize: "14px",
                    },
                    dividerLine: {
                      background: "#EDE5DD",
                    },
                    dividerText: {
                      color: "#8B7D7D",
                      fontSize: "12px",
                      textTransform: "lowercase" as const,
                    },
                    formFieldInput: {
                      border: "1px solid #EDE5DD",
                      borderRadius: "10px",
                      color: "#3D3535",
                      background: "#FFFFFF",
                      padding: "10px 14px",
                      fontSize: "14px",
                      transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                    },
                    formFieldLabel: {
                      color: "#524545",
                      fontWeight: "500",
                      fontSize: "13px",
                      marginBottom: "4px",
                    },
                    formButtonPrimary: {
                      background: "linear-gradient(135deg, #C4848A 0%, #A86A70 100%)",
                      borderRadius: "10px",
                      boxShadow: "0 2px 8px rgba(196, 132, 138, 0.3)",
                      fontWeight: "600",
                      padding: "11px 0",
                      color: "#FFFFFF",
                      fontSize: "14px",
                      letterSpacing: "0.3px",
                      transition: "all 0.2s ease",
                    },
                    footerActionLink: {
                      color: "#C4848A",
                      fontWeight: "500",
                    },
                    identityPreviewEditButton: {
                      color: "#C4848A",
                    },
                    formFieldAction: {
                      color: "#C4848A",
                      fontWeight: "500",
                      fontSize: "13px",
                    },
                    footer: {
                      display: "none",
                    },
                  },
                }}
              />
            </div>
          </div>

          {/* Footer outside card */}
          <div className="mt-6 text-center">
            <p className="text-sm text-warm-gray-400">
              Already have an account?{" "}
              <a
                href="/sign-in"
                className="text-rose-600 hover:text-rose-700 font-medium transition-colors"
              >
                Sign in
              </a>
            </p>
            <p className="mt-4 text-xs text-warm-gray-300">
              Seated — Your wedding, beautifully arranged
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
