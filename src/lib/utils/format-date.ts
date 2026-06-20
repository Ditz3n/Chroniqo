// src/lib/utils/format-date.ts
export const formatDate = (dateString: string | Date, locale: string) => {
  return new Date(dateString).toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
