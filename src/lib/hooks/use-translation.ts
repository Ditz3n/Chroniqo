// src/lib/hooks/use-translation.ts
"use client";

import { TranslationContext } from "@/context/translation-context";
import { useContext } from "react";

export function useTranslation() {
  const context = useContext(TranslationContext);

  // Ensure the hook is used within a TranslationProvider
  if (!context) {
    throw new Error("useTranslation must be used within a TranslationProvider");
  }

  const t = (key: string, params?: Record<string, string | number>): string => {
    // Split the key into section and childKey
    // e.g. "onboarding.illnesses.diabetes" => section: "onboarding", childKey: "illnesses.diabetes"
    const [section, ...rest] = key.split(".");
    const childKey = rest.join(".");

    // If the key format is invalid, log a warning and return the key itself
    if (!section || !childKey) {
      console.warn(`[i18n] Invalid translation key format: ${key}`);
      return key;
    }

    const sectionData = context.dictionary[section];
    if (!sectionData) {
      console.warn(`[i18n] Missing translation for key: ${key}`);
      return key;
    }

    // Support one level of nesting e.g. "illnesses.diabetes"
    const [firstKey, ...nestedRest] = childKey.split(".");
    const nestedKey = nestedRest.join(".");

    const sectionValue = sectionData[firstKey];
    const value =
      nestedKey && typeof sectionValue === "object"
        ? sectionValue[nestedKey]
        : sectionValue;

    // If the translation is missing, log a warning and return the key itself
    if (!value || typeof value !== "string") {
      console.warn(`[i18n] Missing translation for key: ${key}`);
      return key;
    }

    // Interpolate params if provided
    if (!params) return value;
    return Object.entries(params).reduce(
      (str, [k, v]) => str.replace(new RegExp(`{{${k}}}`, "g"), String(v)),
      value,
    );
  };

  return { t, locale: context.locale };
}
