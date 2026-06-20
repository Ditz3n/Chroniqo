// src/app/[locale]/(protected)/u/[username]/friends/(components)/user-avatar.tsx
"use client";

import { DAILY_STATUSES } from "@/lib/constants";
import { useTranslation } from "@/lib/hooks/use-translation";
import { FriendUser } from "@/types/app-types";

function getMoodColor(user: FriendUser): string {
  const status = user.dailyStatuses?.[0];
  if (!status) return "var(--surface-border)";
  return (
    (DAILY_STATUSES as unknown as Record<string, { color: string }>)[
      status.value
    ]?.color ?? "var(--surface-border)"
  );
}

export function UserAvatar({ user }: { user: FriendUser }) {
  const { t } = useTranslation();
  const moodColor = getMoodColor(user);
  const initials = (user.name ?? user.username ?? t("admin.avatar_fallback"))
    .substring(0, 2)
    .toUpperCase();

  return (
    <div
      className="h-10 w-10 rounded-full flex-shrink-0 ring-2 ring-offset-2 ring-offset-background"
      style={{ "--tw-ring-color": moodColor } as React.CSSProperties}
    >
      {user.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.image}
          alt={user.name ?? ""}
          className="h-10 w-10 rounded-full object-cover"
        />
      ) : (
        <div className="h-10 w-10 rounded-full bg-brand/20 flex items-center justify-center">
          <span className="text-xs font-bold text-brand">{initials}</span>
        </div>
      )}
    </div>
  );
}
