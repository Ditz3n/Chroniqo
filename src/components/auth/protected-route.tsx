// src/components/auth/protected-route.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";

interface ProtectedRouteProps {
  children: React.ReactNode;
  locale: string;
  guestOnly?: boolean;
  pageType?:
    | "signup"
    | "login"
    | "onboarding"
    | "feed"
    | "forgot-password"
    | "reset-password";
  searchParams?: { banned?: string };
}

export async function ProtectedRoute({
  children,
  locale,
  guestOnly = false,
  pageType,
  searchParams,
}: ProtectedRouteProps) {
  const session = await auth();

  // Allow banned login page to render for banned users (even if authenticated)
  const isBannedLogin = searchParams?.banned === "true";

  // Rule 1: Completely unauthenticated
  if (!session?.user) {
    if (guestOnly) return <>{children}</>;
    redirect(`/${locale}/login`);
  }

  const hasPassword = session.user.hasPassword;
  const isOnboarded = session.user.onboarded;

  // Rule 2: Authenticated via Google, but hasn't set a password yet
  if (!hasPassword) {
    if (pageType === "signup") return <>{children}</>;
    redirect(`/${locale}/signup`);
  }

  // Rule 3: Authenticated and has username, but not onboarded
  if (!isOnboarded) {
    if (pageType === "onboarding") return <>{children}</>; // Allow them to onboard
    redirect(`/${locale}/onboarding`);
  }

  // Rule 4: Fully authenticated and onboarded
  if (
    guestOnly ||
    pageType === "onboarding" ||
    pageType === "signup" ||
    pageType === "login"
  ) {
    // Exception: allow /login?banned=true to render
    if (isBannedLogin) return <>{children}</>;
    redirect(`/${locale}/feed`);
  }

  return <>{children}</>;
}
