// src/app/[locale]/onboarding/(components)/steps/name-steps.tsx
"use client";

import { USERNAME_MAX } from "@/lib/constants";
import { useTranslation } from "@/lib/hooks/use-translation";
import { useCallback, useEffect, useRef, useState } from "react";
import { StepProps } from "./types";

export function StepFirstName({ data, updateData }: StepProps) {
  const { t } = useTranslation();

  return (
    <div className="relative rounded-xl border border-surface-border transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand animate-in fade-in slide-in-from-right-4 duration-300">
      <input
        id="firstName"
        type="text"
        autoFocus
        placeholder=" "
        value={data.firstName || ""}
        onChange={(e) => updateData({ firstName: e.target.value })}
        className="peer w-full px-4 pt-5 pb-3 rounded-xl bg-transparent text-foreground focus:outline-none outline-none ring-0 focus:ring-0 appearance-none transition-all"
      />
      <label
        htmlFor="firstName"
        className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground-60 transition-all duration-200 pointer-events-none px-1
          peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-brand
          peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs label-bg"
      >
        {t("onboarding.firstName_placeholder")}
      </label>
    </div>
  );
}

export function StepLastName({ data, updateData }: StepProps) {
  const { t } = useTranslation();

  return (
    <div className="relative rounded-xl border border-surface-border transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand animate-in fade-in slide-in-from-right-4 duration-300">
      <input
        id="lastName"
        type="text"
        autoFocus
        placeholder=" "
        value={data.lastName || ""}
        onChange={(e) => updateData({ lastName: e.target.value })}
        className="peer w-full px-4 pt-5 pb-3 rounded-xl bg-transparent text-foreground focus:outline-none outline-none ring-0 focus:ring-0 appearance-none transition-all"
      />
      <label
        htmlFor="lastName"
        className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground-60 transition-all duration-200 pointer-events-none px-1
          peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-brand
          peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs label-bg"
      >
        {t("onboarding.lastName_placeholder")}
      </label>
    </div>
  );
}

export function StepUsername({
  data,
  updateData,
  onValidationChange,
}: StepProps) {
  const { t } = useTranslation();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [validationStatus, setValidationStatus] = useState<
    "available" | "taken" | "checking" | "none"
  >("none");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentUsername = data.username || "";

  // Initial suggestions fetch
  useEffect(() => {
    const fetchSuggestions = async () => {
      setIsFetching(true);
      const first = data.firstName || "";
      const last = data.lastName || "";
      try {
        const res = await fetch(
          `/api/user/onboard/suggestions?first=${encodeURIComponent(first)}&last=${encodeURIComponent(last)}`,
        );
        if (res.ok) {
          const json = await res.json();
          setSuggestions(json.suggestions);
          // Always set the first suggestion as the selected username
          if (json.suggestions[0]) {
            updateData({ username: json.suggestions[0] });
            // Trigger validation check for the selected username
            checkUsernameAvailability(json.suggestions[0]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch username suggestions", err);
      } finally {
        setIsFetching(false);
      }
    };
    fetchSuggestions();
    // Refetch suggestions whenever firstName or lastName changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.firstName, data.lastName]);

  // Debounced username availability check
  const checkUsernameAvailability = useCallback(
    (username: string) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (!username || username.length < 3) {
        setValidationStatus("none");
        onValidationChange?.("none");
        return;
      }

      setValidationStatus("checking");
      onValidationChange?.("checking");

      timeoutRef.current = setTimeout(async () => {
        try {
          const res = await fetch(
            `/api/users/settings/username?username=${encodeURIComponent(username)}`,
          );
          if (res.ok) {
            const json = await res.json();
            const status: "available" | "taken" = json.available
              ? "available"
              : "taken";
            setValidationStatus(status);
            onValidationChange?.(status);
          }
        } catch (err) {
          console.error("Failed to check username availability", err);
          setValidationStatus("none");
          onValidationChange?.("none");
        }
      }, 500);
    },
    [onValidationChange],
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Enforce lowercase and strip disallowed characters in real time
    const clean = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "")
      .slice(0, USERNAME_MAX);
    updateData({ username: clean });
    checkUsernameAvailability(clean);
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex flex-col gap-1">
        {/* Input Container */}
        <div className="relative rounded-xl border border-surface-border transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand">
          <input
            id="username"
            type="text"
            autoFocus
            placeholder=" "
            value={currentUsername}
            onChange={handleUsernameChange}
            maxLength={USERNAME_MAX}
            className="peer w-full px-4 pt-5 pb-3 pr-10 rounded-xl bg-transparent text-foreground focus:outline-none outline-none ring-0 focus:ring-0 appearance-none transition-all"
          />
          <label
            htmlFor="username"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground-60 transition-all duration-200 pointer-events-none px-1
              peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-brand
              peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs label-bg"
          >
            {t("onboarding.username_placeholder")}
          </label>

          {/* Loader - Inside input, on the right */}
          {validationStatus === "checking" && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
              <div className="h-4 w-4 rounded-full border-2 border-foreground-60 border-t-transparent animate-spin" />
            </div>
          )}
        </div>

        {/* Character Counter + Validation Status on same line */}
        <div className="flex justify-between items-center pr-1">
          <div
            className={`flex items-center gap-2 text-xs font-medium transition-all ${
              validationStatus === "available"
                ? "text-[var(--color-dailystatus-full-energy)]"
                : validationStatus === "taken"
                  ? "text-[var(--color-brand)]"
                  : validationStatus === "checking"
                    ? "text-foreground-60"
                    : ""
            }`}
          >
            {validationStatus === "checking" && (
              <>
                <div className="h-3 w-3 rounded-full border-2 border-foreground-60 border-t-transparent animate-spin" />
                <span>{t("onboarding.username_checking")}</span>
              </>
            )}
            {validationStatus === "available" && (
              <>
                <div className="h-3 w-3 rounded-full bg-[var(--color-dailystatus-full-energy)] flex items-center justify-center">
                  <svg
                    className="w-2 h-2 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span>{t("onboarding.username_available")}</span>
              </>
            )}
            {validationStatus === "taken" && (
              <>
                <div className="h-3 w-3 rounded-full bg-[var(--color-brand)] flex items-center justify-center">
                  <svg
                    className="w-2 h-2 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span>{t("onboarding.username_taken")}</span>
              </>
            )}
          </div>

          <span className="text-xs text-foreground-40 font-medium">
            {currentUsername.length} / {USERNAME_MAX}
          </span>
        </div>
      </div>

      {isFetching ? (
        <div className="flex justify-start py-2">
          <div className="h-4 w-4 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        </div>
      ) : suggestions.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-foreground-40 uppercase tracking-wide">
            {t("onboarding.username_suggestions")}
          </p>
          <div className="flex flex-col gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  updateData({ username: s });
                  checkUsernameAvailability(s);
                }}
                className={`text-left px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
                  data.username === s
                    ? "border-brand bg-brand/5 text-brand"
                    : "border-surface-border hover:border-brand/50 hover:bg-foreground/5 text-foreground"
                }`}
              >
                @{s}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
