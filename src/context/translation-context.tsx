// src/context/translation-context.tsx
"use client";

import React, { createContext } from "react";

// Define the shape of the translation dictionary and context
// Supports both flat string values and one level of nesting (e.g. illnesses.diabetes)
export type Dictionary = Record<
  string,
  Record<string, string | Record<string, string>>
>;

export interface TranslationContextType {
  dictionary: Dictionary;
  locale: string;
}

// Create the TranslationContext with a default value of null
export const TranslationContext = createContext<TranslationContextType | null>(
  null,
);

export function TranslationProvider({
  children,
  dictionary,
  locale,
}: {
  children: React.ReactNode;
  dictionary: Dictionary;
  locale: string;
}) {
  return (
    // Wrap children with the TranslationContext provider
    // Passes down the dictionary and locale as the context value
    <TranslationContext.Provider value={{ dictionary, locale }}>
      {children}
    </TranslationContext.Provider>
  );
}
