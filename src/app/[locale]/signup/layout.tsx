// src/app/[locale]/signup/layout.tsx
import { ProtectedRoute } from "@/components/auth/protected-route";

export default async function SignupLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;

  return (
    // Automatically redirect authenticated users to the feed or onboarding page,
    // while allowing guests to access the signup page
    <ProtectedRoute locale={locale} guestOnly pageType="signup">
      {props.children}
    </ProtectedRoute>
  );
}
