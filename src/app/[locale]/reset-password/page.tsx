// src/app/[locale]/reset-password/page.tsx
import { LangPicker } from "@/app/(components)/lang-picker";
import { ThemeToggle } from "@/app/(components)/theme-toggle";
import { getServerTranslation } from "@/lib/utils/server-translation";
import Link from "next/link";
import { ResetPasswordForm } from "./(components)/reset-password-form";

// Use searchParams to extract the ?token= from the URL
export default async function ResetPasswordPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await props.params;
  const { token } = await props.searchParams;
  const { t } = await getServerTranslation(locale);

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col justify-center items-center px-4 sm:px-6 py-6 sm:py-8 overflow-hidden">
      <div className="relative overflow-hidden w-full max-w-[1040px] lg:h-[420px] bg-surface rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 lg:p-10 animate-smiley-entrance flex flex-col lg:flex-row gap-6 sm:gap-8 lg:gap-16 border border-surface-border">
        <ResetPasswordForm token={token} />
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
  );
}
