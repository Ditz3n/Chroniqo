// src/app/[locale]/onboarding/page.tsx
import { LangPicker } from "@/app/(components)/lang-picker";
import { ThemeToggle } from "@/app/(components)/theme-toggle";
import { auth } from "@/auth";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { prisma } from "@/lib/prisma";
import { getServerTranslation } from "@/lib/utils/server-translation";
import Link from "next/link";
import { OnboardingForm } from "./(components)/onboarding-form";

export default async function OnboardingPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  const { t } = await getServerTranslation(locale);
  const session = await auth();

  // Determine whether this user still needs to verify their signup email.
  // Only applies to credentials users (no OAuth accounts).
  let requiresVerification = false;
  let userEmail = "";

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        email: true,
        signupVerified: true,
        // take: 1 avoids a full relation load - we only need to know if any exist
        accounts: { select: { id: true }, take: 1 },
      },
    });

    if (user) {
      userEmail = user.email;
      requiresVerification = !user.signupVerified && user.accounts.length === 0;
    }
  }

  return (
    <ProtectedRoute locale={locale} pageType="onboarding">
      <div className="min-h-[100dvh] bg-background flex flex-col justify-center items-center px-4 sm:px-6 py-6 sm:py-8 overflow-hidden">
        <div className="relative overflow-hidden w-full max-w-[1040px] lg:h-[500px] bg-surface rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 lg:p-10 animate-smiley-entrance flex flex-col lg:flex-row gap-6 sm:gap-8 lg:gap-16 border border-surface-border">
          <OnboardingForm
            requiresVerification={requiresVerification}
            userEmail={userEmail}
          />
        </div>

        <div className="w-full max-w-[1040px] flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
          <div className="flex items-center gap-3">
            <LangPicker variant="full" />
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-6 text-xs font-semibold text-foreground-60">
            <Link
              href="#"
              className="hover:text-foreground transition-colors py-1"
            >
              {t("loginPage.help")}
            </Link>
            <Link
              href={`/${locale}/privacy`}
              className="hover:text-foreground transition-colors py-1"
            >
              {t("loginPage.privacy")}
            </Link>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
