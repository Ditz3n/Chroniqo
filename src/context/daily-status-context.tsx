// src/context/daily-status-context.tsx
"use client";

import { applyBrandColor } from "@/lib/utils/branding";
import type {
  InterceptorInitialValue,
  PendingDebugTest,
} from "@/types/app-types";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useSWRConfig } from "swr";

interface DailyStatusContextType {
  hasRegistered: boolean;
  isChecking: boolean;
  currentValue: number | null;
  markRegistered: (value?: number) => void;
  markUnregistered?: () => void;
  openInterceptor: (initialValue?: number) => void;
  interceptorInitialValue: number | null;
  debugForceOpen: () => void;
  debugTestSuccess: () => void;
  debugTestFailure: () => void;
  pendingDebugTest: null | "success" | "error";
  consumeDebugTest: () => void;
  resetTrigger: number;
}

const DailyStatusContext = createContext<DailyStatusContextType | null>(null);

export function DailyStatusProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { mutate: globalMutate } = useSWRConfig();

  const [hasRegistered, setHasRegistered] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [currentValue, setCurrentValue] = useState<number | null>(null);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [interceptorInitialValue, setInterceptorInitialValue] =
    useState<InterceptorInitialValue>(null);
  const [pendingDebugTest, setPendingDebugTest] =
    useState<PendingDebugTest>(null);

  // Mark the daily status as unregistered (e.g., after deletion/reset)
  const markUnregistered = () => {
    setHasRegistered(false);
    setCurrentValue(null);
    applyBrandColor(null);
  };

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/daily-status/today");
        if (res.ok) {
          const data = await res.json();
          setHasRegistered(data.hasRegistered);

          // Apply brand color from today's registered mood (or reset to default).
          const value: number | undefined = data.status?.value;
          if (typeof value === "number") {
            setCurrentValue(value);
            applyBrandColor(value);
          } else {
            applyBrandColor(null);
          }
        }
      } catch (err) {
        console.error("Failed to check daily status", err);
      } finally {
        setIsChecking(false);
      }
    };
    checkStatus();
  }, []);

  // Pass the newly registered value so the brand color updates immediately
  // without waiting for the next API fetch cycle.
  // Update the call site in daily-status-interceptor.tsx:
  // markRegistered(submittedValue) ← pass the submitted DailyStatus value
  const markRegistered = (value?: number) => {
    setHasRegistered(true);
    if (typeof value === "number") {
      setCurrentValue(value);
      applyBrandColor(value);
    }
    globalMutate(
      (key: unknown) =>
        typeof key === "string" && key.includes("/api/conversations"),
    );
  };

  const openInterceptor = (initialValue?: number) => {
    sessionStorage.removeItem("skippedDailyStatus");
    setInterceptorInitialValue(initialValue ?? null);
    setHasRegistered(false);
    setResetTrigger((prev) => prev + 1);
  };

  const debugForceOpen = () => {
    sessionStorage.removeItem("skippedDailyStatus");
    setHasRegistered(false);
    setResetTrigger((prev) => prev + 1);
  };

  const debugTestSuccess = () => {
    setPendingDebugTest("success");
    sessionStorage.removeItem("skippedDailyStatus");
    setHasRegistered(false);
    setResetTrigger((prev) => prev + 1);
  };

  const debugTestFailure = () => {
    setPendingDebugTest("error");
    sessionStorage.removeItem("skippedDailyStatus");
    setHasRegistered(false);
    setResetTrigger((prev) => prev + 1);
  };

  const consumeDebugTest = () => setPendingDebugTest(null);

  return (
    <DailyStatusContext.Provider
      value={{
        hasRegistered,
        isChecking,
        currentValue,
        markRegistered,
        markUnregistered,
        openInterceptor,
        interceptorInitialValue,
        debugForceOpen,
        debugTestSuccess,
        debugTestFailure,
        pendingDebugTest,
        consumeDebugTest,
        resetTrigger,
      }}
    >
      {children}
    </DailyStatusContext.Provider>
  );
}

export const useDailyStatus = () => {
  const context = useContext(DailyStatusContext);
  if (!context)
    throw new Error("useDailyStatus must be used within DailyStatusProvider");
  return context;
};
