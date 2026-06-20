// src/components/ui/verified-badge.tsx
"use client";

import { Tooltip } from "@/components/ui/tooltip";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";

interface VerifiedBadgeProps {
  className?: string;
}

export function VerifiedBadge({ className }: VerifiedBadgeProps) {
  const { t } = useTranslation();

  return (
    <Tooltip content={t("auth.email_verified")} side="top">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 48 48"
        className={cn("text-brand flex-shrink-0 inline-block", className)}
        aria-label={t("auth.email_verified")}
      >
        {/* Outer burst shape using the current text color (text-brand) */}
        <polygon
          fill="currentColor"
          points="29.62,3 33.053,8.308 39.367,8.624 39.686,14.937 44.997,18.367 42.116,23.995 45,29.62 39.692,33.053 39.376,39.367 33.063,39.686 29.633,44.997 24.005,42.116 18.38,45 14.947,39.692 8.633,39.376 8.314,33.063 3.003,29.633 5.884,24.005 3,18.38 8.308,14.947 8.624,8.633 14.937,8.314 18.367,3.003 23.995,5.884"
        />
        {/* Inner checkmark strictly white to stand out against the brand color */}
        <polygon
          fill="white"
          points="21.396,31.255 14.899,24.76 17.021,22.639 21.428,27.046 30.996,17.772 33.084,19.926"
        />
      </svg>
    </Tooltip>
  );
}
