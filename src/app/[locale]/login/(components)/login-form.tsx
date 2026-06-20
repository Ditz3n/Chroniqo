// src/app/[locale]/login/(components)/login-form.tsx
"use client";

import { ChroniqoLogo } from "@/app/(components)/chroniqo-logo";
import { GoogleButton } from "@/app/(components)/google-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslation } from "@/lib/hooks/use-translation";
import { ChevronDown, UserCircle2 } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BannedUserModal } from "../../(components)/banned-user-modal";

export function LoginForm() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  // Ban Modal State
  const [showBanModal, setShowBanModal] = useState(false);
  const [isDeletingData, setIsDeletingData] = useState(false);
  const [banToken, setBanToken] = useState<string | null>(null);
  const [banReason, setBanReason] = useState<string | null>(null);
  const [banExpires, setBanExpires] = useState<string | null>(null);
  const [dataAlreadyDeleted, setDataAlreadyDeleted] = useState(false);

  // Ref to suppress the Google "cancelled" error when a ban popup closes
  const banReceivedRef = useRef(false);

  // 2. Listen for ban message from popup (runs on the parent /login page)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "OAUTH_BANNED") {
        banReceivedRef.current = true;
        setError(null);
        setBanToken(event.data.token);
        setBanReason(event.data.reason);
        setBanExpires(event.data.expires);
        setDataAlreadyDeleted(event.data.dataAlreadyDeleted ?? false);
        setShowBanModal(true);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Restore state from sessionStorage on mount to survive language changes
  useEffect(() => {
    const savedStep = sessionStorage.getItem("loginStep");
    const savedEmail = sessionStorage.getItem("loginEmail");
    if (savedStep === "2" && savedEmail) {
      setStep(2);
      setEmail(savedEmail);
    }
  }, []);

  // Save state to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem("loginStep", step.toString());
    sessionStorage.setItem("loginEmail", email);
  }, [step, email]);

  async function checkEmailExists(emailToCheck: string): Promise<boolean> {
    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToCheck }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));

        if (res.status === 400) {
          setError(
            data.error === "dummy_account_blocked_login"
              ? t("auth.dummy_account_blocked_login")
              : data.error || t("auth.invalid_email"),
          );
          return false;
        }
        return true;
      }

      const data = await res.json();

      if (data.isBanned) {
        setBanToken(data.token);
        setBanReason(data.reason);
        setBanExpires(data.expires);
        setDataAlreadyDeleted(data.dataAlreadyDeleted ?? false);
        setShowBanModal(true);
        return false;
      }
      return true;
    } catch (err) {
      console.error("[Check Email Error]", err);
      return true;
    }
  }

  const handleNextOrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step === 1) {
      if (!email || !email.includes("@")) {
        setError(t("auth.invalid_email") || "Invalid email format");
        return;
      }
      setError(null);
      setIsCheckingEmail(true);

      const canProceed = await checkEmailExists(email);

      setIsCheckingEmail(false);

      if (canProceed) {
        setStep(2);
      }
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      console.log("[LoginForm] Attempting sign-in for:", email);

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      console.log("[LoginForm] signIn result:", result);

      if (result?.error) {
        // Auth.js returns a generic error to prevent user enumeration
        throw new Error(t("auth.invalid_credentials"));
      }

      console.log("[LoginForm] Sign-in successful");

      if (result?.url && result.url.includes("banned=true")) {
        router.push(result.url);
        return;
      }

      // Clear storage on successful login
      sessionStorage.removeItem("loginStep");
      sessionStorage.removeItem("loginEmail");

      if (rememberMe) {
        // Store an expiry timestamp for 30 days client-side validation
        const expiry = Date.now() + 30 * 24 * 60 * 60 * 1000;
        localStorage.setItem("chroniqo_remember", expiry.toString());
      } else {
        localStorage.removeItem("chroniqo_remember");
      }

      // Always mark this as an active browser session
      sessionStorage.setItem("chroniqo_session", "1");

      // Respect callbackUrl if present and same-origin (prevents open redirect)
      const rawCallback = searchParams.get("callbackUrl");
      const safeCallback =
        rawCallback && rawCallback.startsWith("/") ? rawCallback : null;

      router.push(safeCallback ?? `/${locale}/feed`);
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t("auth.unexpected_error"));
      }
      console.error("[LoginForm] Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseBanModal = () => {
    setShowBanModal(false);
    setBanToken(null);
    setBanReason(null);
    setBanExpires(null);
    setDataAlreadyDeleted(false);
    setEmail("");
  };

  const handleDeleteData = async () => {
    if (!banToken) return;
    setIsDeletingData(true);
    try {
      const res = await fetch("/api/auth/banned-account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: banToken }),
      });

      if (!res.ok) {
        throw new Error(t("auth.unexpected_error"));
      }

      handleCloseBanModal();
    } catch (err) {
      console.error("[LoginForm] Error:", err);
      setError(t("auth.unexpected_error"));
      setShowBanModal(false);
    } finally {
      setIsDeletingData(false);
    }
  };

  return (
    <>
      {/* Loading bar */}
      {isCheckingEmail && (
        <div className="absolute top-0 left-0 right-0 h-[3px] overflow-hidden pointer-events-none z-50">
          <div
            className="h-full w-[42%] bg-brand rounded-full"
            style={{ animation: "brand-sweep 1.3s ease-in-out infinite" }}
          />
        </div>
      )}

      {/* Left Pane */}
      <div className="lg:flex-1 flex flex-col items-start shrink-0">
        <Link
          href={`/${locale}`}
          className="mb-6 lg:mb-8 block hover:opacity-80 transition-opacity shrink-0"
        >
          <ChroniqoLogo width={48} height={48} className="text-foreground" />
        </Link>

        {step === 1 ? (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300">
            <h1 className="text-4xl font-heading text-foreground mb-4">
              {t("loginPage.title")}
            </h1>
            <p className="text-base text-foreground-67 max-w-sm leading-relaxed">
              {t("loginPage.subtitle")}
            </p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300 flex flex-col items-start">
            <h1 className="text-4xl font-heading text-foreground mb-4">
              {t("loginPage.welcome")}
            </h1>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-full border border-surface-border hover:bg-foreground/5 transition-colors group w-max mt-2"
            >
              <UserCircle2
                size={16}
                className="text-foreground-60 group-hover:text-foreground transition-colors"
              />
              <span className="text-sm font-medium text-foreground">
                {email}
              </span>
              <ChevronDown
                size={14}
                className="text-foreground-60 group-hover:text-foreground transition-colors"
              />
            </button>
          </div>
        )}
      </div>

      {/* Right Pane */}
      <div className="lg:flex-[1.2] flex flex-col h-full w-full relative">
        <form
          onSubmit={handleNextOrSubmit}
          className="flex flex-col w-full h-full flex-1"
        >
          <div className="flex-1 flex flex-col justify-center">
            {error && (
              <div className="p-3 text-sm text-white bg-brand rounded-xl mb-4">
                {error}
              </div>
            )}

            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="relative rounded-xl border border-surface-border transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand">
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder=" "
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="peer w-full px-4 pt-5 pb-3 rounded-xl bg-transparent text-foreground focus:outline-none outline-none ring-0 focus:ring-0 appearance-none transition-all"
                  />
                  <label
                    htmlFor="email"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground-60 transition-all duration-200 pointer-events-none px-1
      peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-brand
      peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs label-bg"
                  >
                    {t("auth.email_label")}
                  </label>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                <p className="text-sm font-medium text-foreground-67 mb-6">
                  {t("loginPage.verify_text")}
                </p>

                <div className="relative rounded-xl border border-surface-border transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoFocus
                    placeholder=" "
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="peer w-full px-4 pt-5 pb-3 rounded-xl border border-surface-border bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-brand transition-all"
                  />
                  <label
                    htmlFor="password"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground-60 transition-all duration-200 pointer-events-none px-1
       peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-brand
      peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs label-bg"
                  >
                    {t("auth.password_label")}
                  </label>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="show-password"
                      checked={showPassword}
                      onCheckedChange={(c) => setShowPassword(c as boolean)}
                    />
                    <label
                      htmlFor="show-password"
                      className="text-sm font-medium text-foreground-60 cursor-pointer select-none"
                    >
                      {t("auth.show_password")}
                    </label>
                  </div>

                  {/* Remember Me Checkbox */}
                  <div className="flex items-center gap-2 mt-1">
                    <Checkbox
                      id="remember-me"
                      checked={rememberMe}
                      onCheckedChange={(c) => setRememberMe(c as boolean)}
                    />
                    <label
                      htmlFor="remember-me"
                      className="text-sm font-medium text-foreground-60 cursor-pointer select-none"
                    >
                      {t("auth.remember_me")}
                    </label>
                  </div>

                  {/* Below input: visible on sm, hidden on md+ */}
                  <Link
                    href={`/${locale}/forgot-password`}
                    className="sm:hidden text-sm font-semibold text-brand hover:underline transition-colors"
                  >
                    {t("resetPassword.forgot_title")}
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 lg:mt-auto pt-4 flex flex-row items-center justify-between w-full gap-2">
            <div className="flex-shrink-0">
              {step === 1 && (
                <Link
                  href={`/${locale}/signup`}
                  className="text-sm font-semibold text-brand hover:bg-brand/10 px-3 py-2 rounded-full transition-colors -ml-3"
                >
                  {t("auth.signup_link")}
                </Link>
              )}
              {step === 2 && (
                <Link
                  href={`/${locale}/forgot-password`}
                  className="hidden sm:block text-sm font-semibold text-brand hover:bg-brand/10 px-3 py-2 rounded-full transition-colors -ml-3"
                >
                  {t("resetPassword.forgot_title")}
                </Link>
              )}
            </div>

            <div className="flex items-center gap-2">
              <GoogleButton
                compact
                className="h-[42px]"
                onError={(msg) => {
                  if (!banReceivedRef.current) {
                    setError(msg);
                  }
                }}
              />
              <Button
                type="submit"
                disabled={isLoading || isCheckingEmail}
                className="px-6 py-2.5 rounded-full text-sm h-[42px] shrink-0"
              >
                {isLoading || isCheckingEmail
                  ? t("auth.loading_dots")
                  : step === 1
                    ? t("loginPage.next")
                    : t("auth.login_submit")}
              </Button>
            </div>
          </div>
        </form>
      </div>

      <BannedUserModal
        isOpen={showBanModal}
        onClose={handleCloseBanModal}
        onDelete={handleDeleteData}
        isDeleting={isDeletingData}
        dataAlreadyDeleted={dataAlreadyDeleted}
        reason={banReason}
        expires={banExpires}
      />
    </>
  );
}
