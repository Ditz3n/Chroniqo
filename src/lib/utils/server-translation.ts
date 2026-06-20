// src/lib/utils/server-translation.ts
import "server-only";
import { getDictionary } from "./dictionary";

export async function getServerTranslation(locale: string) {
  const dictionary = await getDictionary(locale);

  const t = (key: string): string => {
    // Split the key into section and childKey
    // e.g. "onboarding.illnesses.diabetes" => section: "onboarding", childKey: "illnesses.diabetes"
    const [section, ...rest] = key.split(".");
    const childKey = rest.join(".");

    if (!section || !childKey) {
      console.warn(`[i18n-server] Invalid translation key format: ${key}`);
      return key;
    }

    const sectionData = dictionary[section];
    if (!sectionData) {
      console.warn(`[i18n-server] Missing translation for key: ${key}`);
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

    if (!value || typeof value !== "string") {
      console.warn(`[i18n-server] Missing translation for key: ${key}`);
      return key;
    }

    return value;
  };

  return { t, locale };
}
