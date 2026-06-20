// src/app/[locale]/login/page.tsx
"use client";
import { LangPicker } from "@/app/(components)/lang-picker";
import { ThemeToggle } from "@/app/(components)/theme-toggle";
import { useTranslation } from "@/lib/hooks/use-translation";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AccountDeletedModal } from "../(components)/account-deleted-modal";
import { BannedUserModal } from "../(components)/banned-user-modal";
import { LoginForm } from "./(components)/login-form";

export default function LoginPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale as string;
  const banned = searchParams.get("banned");
  const accountDeleted = searchParams.get("accountDeleted");
  const reason = searchParams.get("reason");
  const expires = searchParams.get("expires");
  const dataAlreadyDeleted = searchParams.get("dataAlreadyDeleted");
  const { t } = useTranslation();

  // Modal state: open if banned=true in URL
  const [showBanModal, setShowBanModal] = useState(banned === "true");
  // If the URL changes to include banned=true, open the modal
  useEffect(() => {
    setShowBanModal(banned === "true");
  }, [banned]);

  const [showDeletedModal, setShowDeletedModal] = useState(
    accountDeleted === "true",
  );
  useEffect(() => {
    setShowDeletedModal(accountDeleted === "true");
  }, [accountDeleted]);

  return (
    <>
      <div className="min-h-[100dvh] bg-background flex flex-col justify-center items-center px-4 sm:px-6 py-6 sm:py-8 overflow-hidden">
        <div className="relative overflow-hidden w-full max-w-[1040px] lg:h-[420px] bg-surface rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 lg:p-10 animate-smiley-entrance flex flex-col lg:flex-row gap-6 sm:gap-8 lg:gap-16 border border-surface-border">
          <Suspense
            fallback={
              <div className="h-full w-full flex items-center justify-center">
                <div className="h-8 w-8 rounded-full border-4 border-brand border-t-transparent animate-spin" />
              </div>
            }
          >
            <LoginForm />
          </Suspense>
        </div>

        <div className="w-full max-w-[1040px] flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
          <div className="flex items-center gap-3">
            <LangPicker variant="full" />
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-6 text-xs font-semibold text-foreground-60">
            <Link
              href={`/${locale}/help`}
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
      <BannedUserModal
        isOpen={showBanModal}
        onClose={() => setShowBanModal(false)}
        onDelete={() => {}}
        isDeleting={false}
        reason={reason || null}
        expires={expires || null}
        dataAlreadyDeleted={dataAlreadyDeleted === "true"}
      />

      <AccountDeletedModal
        isOpen={showDeletedModal}
        onClose={() => setShowDeletedModal(false)}
      />
    </>
  );
}
