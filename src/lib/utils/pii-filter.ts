// src/lib/utils/pii-filter.ts

import { PiiFilterUserContext } from "@/types/app-types";

/*
 * Simple utility to filter out common types of PII from user input before sending to AI.
 * Currently filters:
 * - Emails
 * - Danish CPR numbers
 * - Phone numbers (generic international and Danish formats)
 * - User's own name (if provided in context)
 *
 * This is a basic implementation and may not catch all edge cases or international formats.
 * The AI system is also instructed to never reveal that PII is being filtered.
 */

export function filterPII(
  text: string,
  userContext?: PiiFilterUserContext,
): string {
  let filtered = text;

  // 1. Filter Emails
  filtered = filtered.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    "[EMAIL REMOVED]",
  );

  // 2. Filter Danish CPR numbers
  filtered = filtered.replace(/\b\d{6}-?\d{4}\b/g, "[CPR REMOVED]");

  // 3. Filter Phone Numbers
  // App does not contain phone numbers,
  // but this is a common PII type that could be shared in chat
  filtered = filtered.replace(
    /(?:\+45\s*)?\b\d{2}\s*\d{2}\s*\d{2}\s*\d{2}\b/g,
    "[PHONE REMOVED]",
  );

  // 4. Filter specific user names if provided (Fixed TS error here)
  if (userContext) {
    const namesToRedact = [
      userContext.name,
      userContext.firstName,
      userContext.lastName,
      ...(userContext.name?.split(/\s+/) ?? []),
    ].filter((n): n is string => typeof n === "string" && n.length > 2);

    namesToRedact.forEach((name) => {
      const safeName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${safeName}\\b`, "gi");
      filtered = filtered.replace(regex, "[NAME REMOVED]");
    });
  }

  filtered = filtered.replace(
    /(\[NAME REMOVED\])(\s*\[NAME REMOVED\])+/g,
    "[NAME REMOVED]",
  );

  // 5. Safety cleanup: Ensure space between any adjacent tags if mashed together
  filtered = filtered.replace(
    /(\[[A-Z ]+REMOVED\])(?=\[[A-Z ]+REMOVED\])/g,
    "$1 ",
  );

  return filtered;
}
