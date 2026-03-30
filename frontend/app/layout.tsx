import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { AuthTokenProvider } from "@/components/providers/AuthTokenProvider";

export const metadata: Metadata = {
  title: "Seated — Wedding Seating Planner",
  description:
    "Beautifully plan your wedding seating arrangement with AI-powered table assignments, spatial layouts, and PDF exports.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      afterSignOutUrl="/sign-in"
      appearance={{
        variables: {
          colorPrimary: "#E8B4B8",
          colorTextOnPrimaryBackground: "#3D3535",
          colorBackground: "#FFFCF8",
          colorInputBackground: "#FFFFFF",
          colorInputText: "#3D3535",
          colorText: "#3D3535",
          colorTextSecondary: "#6B5B5B",
          colorDanger: "#DC2626",
          borderRadius: "8px",
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: "14px",
        },
        elements: {
          card: "shadow-card border border-cream-200 bg-cream-50",
          headerTitle: "font-serif text-warm-gray-800",
          headerSubtitle: "text-warm-gray-400",
          formButtonPrimary:
            "bg-rose-400 hover:bg-rose-500 text-white shadow-none font-medium",
          formFieldInput:
            "border-cream-200 focus:border-rose-400 focus:ring-rose-400/25 bg-white",
          footerActionLink: "text-rose-500 hover:text-rose-600 font-medium",
          socialButtonsBlockButton:
            "border-cream-200 hover:bg-cream-100 text-warm-gray-600",
          dividerLine: "bg-cream-200",
          dividerText: "text-warm-gray-400",
          identityPreview: "border-cream-200",
          formFieldLabel: "text-warm-gray-600 font-medium",
          userButtonAvatarBox: "w-8 h-8",
          userButtonPopoverCard: "shadow-card-hover border border-cream-200",
          userButtonPopoverActionButton: "text-warm-gray-600 hover:bg-cream-50",
          userButtonPopoverActionButtonText: "text-warm-gray-600",
          userButtonPopoverFooter: "hidden",
        },
      }}
    >
      <html lang="en">
        <body className="min-h-screen">
          <AuthTokenProvider>{children}</AuthTokenProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
