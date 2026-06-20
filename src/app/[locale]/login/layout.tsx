// src/app/[locale]/login/layout.tsx

import { ProtectedRoute } from "@/components/auth/protected-route";
import type { LoginLayoutProps } from "@/types/app-types";

export default async function LoginLayout(props: LoginLayoutProps) {
  const { locale } = await props.params;
  return (
    <ProtectedRoute locale={locale} guestOnly pageType="login">
      {props.children}
    </ProtectedRoute>
  );
}
