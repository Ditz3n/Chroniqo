// src/app/[locale]/signup/(components)/signup-form.tsx
"use client";

import { ChroniqoLogo } from "@/app/(components)/chroniqo-logo";
import { GoogleButton } from "@/app/(components)/google-button";
import { BannedUserModal } from "@/app/[locale]/(components)/banned-user-modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslation } from "@/lib/hooks/use-translation";
import { UserCircle2 } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Step = 1 | 2;

export function SignupForm() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const { data: session, status, update } = useSession();

  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const completedRef = useRef(false);

  // Ban modal state
  const [showBanModal, setShowBanModal] = useState(false);
  const [banToken, setBanToken] = useState<string | null>(null);
  const [banReason, setBanReason] = useState<string | null>(null);
  const [banExpires, setBanExpires] = useState<string | null>(null);
  const [dataAlreadyDeleted, setDataAlreadyDeleted] = useState(false);
  const [isDeletingData, setIsDeletingData] = useState(false);

  const banReceivedRef = useRef(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "OAUTH_BANNED") {
        banReceivedRef.current = true;
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

  const isGoogleCompletion =
    status === "authenticated" && !session?.user?.hasPassword;

  useEffect(() => {
    if (isGoogleCompletion && session?.user?.email && !completedRef.current) {
      setEmail(session.user.email);
      setStep(2);
    }
  }, [isGoogleCompletion, session]);

  if (status === "loading" || isRedirecting) {
    return <div className="h-64" />;
  }

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (step === 1) {
      if (!email || !email.includes("@")) {
        setError(t("auth.invalid_email") || "Invalid email format");
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch("/api/auth/check-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();

        if (data.isBanned) {
          setBanToken(data.token);
          setBanReason(data.reason);
          setBanExpires(data.expires);
          setDataAlreadyDeleted(data.dataAlreadyDeleted ?? false);
          setShowBanModal(true);
          return;
        }

        setStep(2);
      } catch {
        setStep(2); // fail open
      } finally {
        setIsLoading(false);
      }
      return;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t("auth.passwords_dont_match") || "Passwords don't match");
      return;
    }

    setIsLoading(true);

    try {
      if (isGoogleCompletion) {
        console.log("[SignupForm] Completing Google signup for user:", email);
        const res = await fetch("/api/auth/complete-google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to complete signup");
        }

        completedRef.current = true;
        setIsRedirecting(true);
        await update({ hasPassword: true });
        router.push(`/${locale}/onboarding`);
      } else {
        console.log("[SignupForm] Attempting to register user:", email);
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Registration failed");
        }

        console.log("[SignupForm] Registration successful, attempting sign-in");

        // 2. Automatically sign user in using Auth.js Credentials provider
        const signInRes = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (signInRes?.error) throw new Error("Failed to auto-login");

        console.log(
          "[SignupForm] Sign-in successful, redirecting to onboarding",
        );

        // 3. Redirect to the onboarding page and refresh router state
        router.push(`/${locale}/onboarding`);
        router.refresh();
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/user", { method: "DELETE" });
      signOut({ callbackUrl: "/" });
    } catch {
      setError("Failed to cancel signup");
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
      if (!res.ok) throw new Error();
      handleCloseBanModal();
    } catch {
      setError(t("auth.unexpected_error"));
      setShowBanModal(false);
    } finally {
      setIsDeletingData(false);
    }
  };

  const leftContent = {
    1: {
      title: t("signupPage.title"),
      subtitle: t("signupPage.subtitle"),
    },
    2: {
      title: t("signupPage.password_title"),
      subtitle: t("signupPage.password_subtitle"),
    },
  };

  return (
    <>
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
              {leftContent[1].title}
            </h1>
            <p className="text-base text-foreground-67 max-w-sm leading-relaxed">
              {leftContent[1].subtitle}
            </p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300 flex flex-col items-start">
            <h1 className="text-4xl font-heading text-foreground mb-4">
              {leftContent[step].title}
            </h1>

            {!isGoogleCompletion && (
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
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right Pane */}
      <div className="lg:flex-[1.2] flex flex-col h-full w-full relative">
        <form
          onSubmit={step === 2 ? handleSubmit : handleNext}
          className="flex flex-col w-full h-full flex-1"
        >
          <div className="flex-1 flex flex-col justify-center">
            {error && (
              <div className="p-3 text-sm text-white bg-brand rounded-xl mb-4">
                {error}
              </div>
            )}

            {isGoogleCompletion && step === 2 && (
              <div className="p-4 rounded-xl border-3 border-brand text-center mb-6">
                <p className="text-sm font-medium text-foreground">
                  {t("auth.complete_google_msg")}
                </p>
              </div>
            )}

            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="relative rounded-xl border border-surface-border transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand">
                  <input
                    id="email"
                    type="email"
                    required
                    autoFocus
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
              <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="relative rounded-xl border border-surface-border transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoFocus
                    minLength={8}
                    placeholder=" "
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="peer w-full px-4 pt-5 pb-3 rounded-xl bg-transparent text-foreground focus:outline-none outline-none ring-0 focus:ring-0 appearance-none transition-all"
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

                <div className="relative rounded-xl border border-surface-border transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand">
                  <input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder=" "
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="peer w-full px-4 pt-5 pb-3 rounded-xl bg-transparent text-foreground focus:outline-none outline-none ring-0 focus:ring-0 appearance-none transition-all"
                  />
                  <label
                    htmlFor="confirm-password"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground-60 transition-all duration-200 pointer-events-none px-1
                      peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-brand
                      peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs label-bg"
                  >
                    {t("auth.confirm_password_label")}
                  </label>
                </div>

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
              </div>
            )}
          </div>

          <div className="mt-8 lg:mt-auto pt-4 flex flex-row items-center justify-between w-full gap-2">
            <div className="flex-shrink-0">
              {isGoogleCompletion ? (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="text-sm font-semibold text-brand hover:bg-brand/10 px-3 py-2 rounded-full transition-colors -ml-3"
                >
                  {t("onboarding.cancel")}
                </button>
              ) : step === 2 ? (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep(1);
                  }}
                  className="text-sm font-semibold text-brand hover:bg-brand/10 px-3 py-2 rounded-full transition-colors -ml-3"
                >
                  ← {t("signupPage.back_to_login")}
                </button>
              ) : (
                <Link
                  href={`/${locale}/login`}
                  className="text-sm font-semibold text-brand hover:bg-brand/10 px-3 py-2 rounded-full transition-colors -ml-3"
                >
                  {t("signupPage.back_to_login")}
                </Link>
              )}
            </div>

            <div className="flex items-center gap-2">
              {step === 1 && (
                <GoogleButton
                  compact
                  className="h-[42px]"
                  onError={(msg) => {
                    if (!banReceivedRef.current) setError(msg);
                  }}
                />
              )}
              <Button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 rounded-full text-sm h-[42px] shrink-0"
              >
                {isLoading
                  ? t("auth.loading_dots")
                  : step === 2
                    ? t("auth.signup_submit")
                    : t("loginPage.next")}
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
        reason={banReason}
        expires={banExpires}
        dataAlreadyDeleted={dataAlreadyDeleted}
      />
    </>
  );
}
