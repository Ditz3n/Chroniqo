// src/app/[locale]/(protected)/communities/[name]/members/(components)/pending-requests-tab.tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/hooks/use-translation";
import { getMoodRingColor } from "@/lib/utils/mood-ring";
import { ApiCommunityMember } from "@/types/app-types";
import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function PendingRequestsTab({
  pending,
  communityName,
  onUpdate,
}: {
  pending: ApiCommunityMember[];
  communityName: string;
  onUpdate: () => void;
}) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleAction = async (userId: string, action: "ACCEPT" | "REJECT") => {
    setLoadingId(userId);
    try {
      const res = await fetch(
        `/api/communities/${encodeURIComponent(communityName)}/requests/${userId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );

      if (res.ok) onUpdate();
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingId(null);
    }
  };

  if (!pending || pending.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-foreground-40">
        <p className="text-sm font-medium">
          {t("communityPage.no_pending_requests")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {pending.map((member) => (
        <div
          key={member.userId}
          className="group flex items-center justify-between gap-3 px-4 py-3 bg-surface hover:bg-foreground/5 border-b sm:border border-surface-border sm:rounded-2xl sm:mb-3 last:border-b-0 cursor-pointer"
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest("button, a")) return;
            if (!member.user.username) return;
            router.push(
              `/${locale}/u/${encodeURIComponent(member.user.username)}`,
            );
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Avatar
              className="h-10 w-10 border border-surface-border ring-2 ring-offset-1 ring-offset-background"
              style={
                {
                  "--tw-ring-color": getMoodRingColor(
                    member.user.dailyStatuses?.[0]?.value,
                  ),
                } as React.CSSProperties
              }
            >
              {member.user.image && <AvatarImage src={member.user.image} />}
              <AvatarFallback className="text-xs bg-background text-foreground">
                {member.user.username?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-foreground truncate group-hover:underline">
                {member.user.name || member.user.username}
              </span>
              <span className="text-xs text-foreground-60 truncate">
                u/{member.user.username}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {loadingId === member.userId ? (
              <div className="h-5 w-5 border-2 border-brand border-t-transparent rounded-full animate-spin mr-4" />
            ) : (
              <>
                <Button
                  onClick={() => handleAction(member.userId, "REJECT")}
                  variant="brand"
                  size="icon"
                  className="h-9 w-9"
                >
                  <X className="h-5 w-5" />
                </Button>
                <Button
                  onClick={() => handleAction(member.userId, "ACCEPT")}
                  variant="outline-success"
                  size="icon"
                  className="h-9 w-9"
                >
                  <Check className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
