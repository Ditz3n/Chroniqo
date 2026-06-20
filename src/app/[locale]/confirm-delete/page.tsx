// src/app/[locale]/confirm-delete/page.tsx
import { LangPicker } from "@/app/(components)/lang-picker";
import { ThemeToggle } from "@/app/(components)/theme-toggle";
import { getServerTranslation } from "@/lib/utils/server-translation";
import Link from "next/link";
import { ConfirmDeleteForm } from "./(components)/confirm-delete-form";

export default async function ConfirmDeletePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  const { token } = await searchParams;
  const { t } = await getServerTranslation(locale);

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col justify-center items-center px-4 sm:px-6 py-6 sm:py-8 overflow-hidden">
      <ConfirmDeleteForm token={token ?? ""} locale={locale} />

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
            {t("confirmDelete.help")}
          </Link>
          <Link
            href={`/${locale}/privacy`}
            className="hover:text-foreground transition-colors py-1"
          >
            {t("confirmDelete.privacy")}
          </Link>
        </div>
      </div>
    </div>
  );
}
