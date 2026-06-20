// src/lib/utils/dictionary.ts
import "server-only";

// Supports both flat string values and one level of nesting (e.g. illnesses.diabetes)
type Dictionary = Record<
  string,
  Record<string, string | Record<string, string>>
>;

const dictionaries: Record<string, () => Promise<Dictionary>> = {
  en: () => import("@/messages/en.json").then((module) => module.default),
  da: () => import("@/messages/da.json").then((module) => module.default),
};

export const getDictionary = async (locale: string): Promise<Dictionary> => {
  // Fallback to Danish if locale is missing or invalid
  const loadDictionary = dictionaries[locale] ?? dictionaries.da;
  return loadDictionary();
};
