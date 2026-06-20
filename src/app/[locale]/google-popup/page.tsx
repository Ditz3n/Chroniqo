// src/app/[locale]/google-popup/page.tsx
"use client";

import { useTranslation } from "@/lib/hooks/use-translation";
import { signIn } from "next-auth/react";
import { useEffect } from "react";

export default function GooglePopupPage() {
  const { t, locale } = useTranslation();

  useEffect(() => {
    // Read the resolved theme from the live DOM - reliable regardless of how the
    // ThemeProvider stores it (localStorage, cookie, or system preference).
    const isDark = document.documentElement.classList.contains("dark");
    const theme = isDark ? "dark" : "light";

    // Pass locale and theme so popup-callback renders the remember-me page correctly
    // This officially fires the POST request with the CSRF token needed by NextAuth v5
    signIn(
      "google",
      {
        callbackUrl: `/api/auth/popup-callback?showRemember=true&locale=${locale}&theme=${theme}`,
      },
      {
        prompt: "select_account",
      },
    );
  }, [locale]);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-background text-foreground font-sans">
      <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-sm font-medium text-foreground-60">
        {t("auth.google_redirect")}
      </p>
    </div>
  );
}
