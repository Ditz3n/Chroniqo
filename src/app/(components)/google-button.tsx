// src/app/(components)/google-button.tsx
"use client";

import { useTranslation } from "@/lib/hooks/use-translation";
import { getSession } from "next-auth/react";
import { useState } from "react";

interface GoogleButtonProps {
  className?: string;
  compact?: boolean;
  onError?: (msg: string) => void;
}

export function GoogleButton({
  className = "",
  compact = false,
  onError,
}: GoogleButtonProps) {
  const { t, locale } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleAuth = () => {
    setIsLoading(true);
    setError(null);

    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    // Open internal page that handles the secure CSRF POST request
    const popup = window.open(
      `/${locale}/google-popup`,
      "google-auth",
      `width=${width},height=${height},top=${top},left=${left}`,
    );

    let isSuccess = false;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === "google-auth-success") {
        isSuccess = true;

        // Handle "Remember Me" choice from popup
        const rememberMe = event.data.rememberMe;
        sessionStorage.setItem("chroniqo_session", "1");

        if (rememberMe) {
          // Store an expiry timestamp for 30 days client-side validation
          const expiry = Date.now() + 30 * 24 * 60 * 60 * 1000;
          localStorage.setItem("chroniqo_remember", expiry.toString());
        } else {
          localStorage.removeItem("chroniqo_remember");
        }

        window.removeEventListener("message", handleMessage);

        const params = new URLSearchParams(window.location.search);
        const rawCallback = params.get("callbackUrl");
        // Same same-origin guard used in the credentials flow
        const safeCallback =
          rawCallback && rawCallback.startsWith("/") ? rawCallback : null;
        if (safeCallback) {
          window.location.href = safeCallback;
        } else {
          window.location.reload();
        }
      }

      if (event.data?.type === "OAUTH_BANNED") {
        isSuccess = true;
        setIsLoading(false);
        window.removeEventListener("message", handleMessage);
      }
    };

    window.addEventListener("message", handleMessage);

    const timer = setInterval(() => {
      if (popup?.closed) {
        clearInterval(timer);
        window.removeEventListener("message", handleMessage);

        if (!isSuccess) {
          // The popup may have been closed after Google OAuth completed but before
          // the user made a remember-me choice (e.g. they clicked the window X).
          // In that case an Auth.js session cookie already exists, so checking
          // isSuccess alone is not enough to distinguish a real cancellation from
          // a dismissed remember-me prompt.
          getSession().then((session) => {
            if (session) {
              // Auth succeeded - treat the dismissed prompt as "don't remember me".
              // Setting only sessionStorage means the current tab stays logged in
              // but new tabs will require re-authentication.
              sessionStorage.setItem("chroniqo_session", "1");
              localStorage.removeItem("chroniqo_remember");

              const params = new URLSearchParams(window.location.search);
              const rawCallback = params.get("callbackUrl");
              const safeCallback =
                rawCallback && rawCallback.startsWith("/") ? rawCallback : null;
              if (safeCallback) {
                window.location.href = safeCallback;
              } else {
                window.location.reload();
              }
            } else {
              // No session - the user cancelled before Google auth completed.
              const msg = t("auth.google_error");
              if (onError) {
                onError(msg);
              } else {
                setError(msg);
              }
              setIsLoading(false);
            }
          });
        }
      }
    }, 500);
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {error && !onError && (
        <span className="text-xs font-semibold text-brand text-center absolute -top-6">
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={handleGoogleAuth}
        disabled={isLoading}
        className="cursor-pointer w-full h-full flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-surface-border bg-transparent text-foreground font-medium hover:bg-foreground/5 transition-all disabled:opacity-50 disabled:pointer-events-none text-sm"
      >
        {!isLoading && (
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
              <path
                fill="#4285F4"
                d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"
              />
              <path
                fill="#34A853"
                d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"
              />
              <path
                fill="#FBBC05"
                d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"
              />
              <path
                fill="#EA4335"
                d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 41.939 C -8.804 39.869 -11.514 38.649 -14.754 38.649 C -19.444 38.649 -23.494 41.349 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"
              />
            </g>
          </svg>
        )}
        {isLoading
          ? t("auth.google_loading_dots")
          : compact
            ? t("auth.google")
            : t("auth.continue_google")}
      </button>
    </div>
  );
}
