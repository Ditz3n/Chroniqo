// src/app/[locale]/(protected)/(components)/notifications-dropdown.tsx
"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  IconAvatar,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip } from "@/components/ui/tooltip";
import { useTodayStatus } from "@/lib/hooks/use-chat";
import { useTranslation } from "@/lib/hooks/use-translation";
import { fillI18nTemplate, parseI18nPayload } from "@/lib/utils/i18n-payload";
import { getMoodRingColor } from "@/lib/utils/mood-ring";
import { ApiNotification, FriendRequestsResponse } from "@/types/app-types";
import {
  AlertTriangle,
  Ban,
  Bell,
  Check,
  Eye,
  EyeOff,
  UserMinus,
  UserPlus,
  VolumeX,
  X,
} from "lucide-react";
import Link from "next/link";
import useSWR from "swr";

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to fetch");
  }
  return res.json() as Promise<T>;
};

const renderNotificationIcon = (notif: ApiNotification) => {
  const payload = parseI18nPayload(notif.message);

  if (payload?.key === "communityPage.join_request_accepted_msg") {
    return (
      <div className="h-9 w-9 rounded-full bg-feedback-success/10 flex items-center justify-center">
        <Check className="h-5 w-5 text-feedback-success" />
      </div>
    );
  }

  if (payload?.key === "communityPage.join_request_declined_msg") {
    return (
      <div className="h-9 w-9 rounded-full bg-brand/10 flex items-center justify-center">
        <X className="h-5 w-5 text-brand" />
      </div>
    );
  }

  if (
    payload?.key === "topNavbar.community_suspended" ||
    payload?.key === "topNavbar.community_suspended_with_reason"
  ) {
    return (
      <div className="h-9 w-9 rounded-full bg-warning/10 flex items-center justify-center">
        <EyeOff className="h-5 w-5 text-warning" />
      </div>
    );
  }

  if (payload?.key === "topNavbar.community_reinstated") {
    return (
      <div className="h-9 w-9 rounded-full bg-warning/10 flex items-center justify-center">
        <Eye className="h-5 w-5 text-warning" />
      </div>
    );
  }

  if (
    payload?.key === "topNavbar.member_muted_message" ||
    payload?.key === "topNavbar.member_muted_message_with_reason"
  ) {
    return (
      <div className="h-9 w-9 rounded-full bg-foreground/10 flex items-center justify-center">
        <VolumeX className="h-5 w-5 text-foreground-60" />
      </div>
    );
  }

  if (
    payload?.key === "topNavbar.member_kicked_message" ||
    payload?.key === "topNavbar.member_kicked_message_with_reason"
  ) {
    return (
      <div className="h-9 w-9 rounded-full bg-brand/10 flex items-center justify-center">
        <UserMinus className="h-5 w-5 text-brand" />
      </div>
    );
  }

  if (
    payload?.key === "topNavbar.member_banned_message" ||
    payload?.key === "topNavbar.member_banned_message_with_reason" ||
    payload?.key === "topNavbar.community_deleted" ||
    payload?.key === "topNavbar.community_deleted_with_reason" ||
    payload?.key === "topNavbar.reported_user_banned_message"
  ) {
    return (
      <div className="h-9 w-9 rounded-full bg-brand/10 flex items-center justify-center">
        <Ban className="h-5 w-5 text-brand" />
      </div>
    );
  }

  if (
    payload?.key === "topNavbar.member_role_updated_admin_message" ||
    payload?.key === "topNavbar.member_role_updated_moderator_message" ||
    payload?.key === "topNavbar.member_role_updated_user_message" ||
    payload?.key === "topNavbar.member_owner_transferred_message"
  ) {
    return (
      <div className="h-9 w-9 rounded-full bg-brand/10 flex items-center justify-center">
        <UserPlus className="h-5 w-5 text-brand" />
      </div>
    );
  }

  // Default: warning / moderation / system
  return (
    <div className="h-9 w-9 rounded-full bg-warning/10 flex items-center justify-center">
      <AlertTriangle className="h-5 w-5 text-warning" />
    </div>
  );
};

const renderNotificationTitle = (
  notif: ApiNotification,
  t: (key: string) => string,
) => {
  const titlePayload = parseI18nPayload(notif.title);
  if (titlePayload) {
    return fillI18nTemplate(t(titlePayload.key), titlePayload.params);
  }

  return notif.title;
};

const renderNotificationMessage = (
  notif: ApiNotification,
  t: (key: string) => string,
  locale: string,
) => {
  const messagePayload = parseI18nPayload(notif.message);

  if (messagePayload) {
    const { key, params } = messagePayload;
    const template = t(key);

    // --- Global User Ban ---
    if (key === "topNavbar.reported_user_banned_message") {
      const user = params.user || "Unknown";
      const splitToken = template.includes("u/{{user}}")
        ? "u/{{user}}"
        : "{{user}}";
      const prefix = splitToken === "u/{{user}}" ? "u/" : "";
      const [before, after] = template.split(splitToken);

      return (
        <>
          {before}
          <Link
            href={`/${locale}/u/${encodeURIComponent(user)}`}
            className="text-foreground font-semibold hover:underline"
          >
            {prefix}
            {user}
          </Link>
          {after}
        </>
      );
    }

    // --- Community Join Request ({{user}} + {{community}}) ---
    if (key === "communityPage.join_request_msg") {
      const user = params.user || "Unknown";
      const community = params.community || "";

      const splitUser = template.includes("u/{{user}}")
        ? "u/{{user}}"
        : "{{user}}";
      const [beforeUser, afterUserPart] = template.split(splitUser);
      const afterUser = afterUserPart || "";

      const splitComm = afterUser.includes("c/{{community}}")
        ? "c/{{community}}"
        : "{{community}}";
      const [beforeComm, afterComm] = afterUser.split(splitComm);

      return (
        <>
          {beforeUser}
          <Link
            href={`/${locale}/u/${encodeURIComponent(user)}`}
            className="text-foreground font-semibold hover:underline"
          >
            u/{user}
          </Link>
          {beforeComm || afterUser}
          {afterUser.includes(splitComm) && (
            <Link
              href={`/${locale}/communities/${encodeURIComponent(community)}`}
              className="text-foreground font-semibold hover:underline"
            >
              c/{community}
            </Link>
          )}
          {afterComm}
        </>
      );
    }

    // --- Post Deleted / Post Warned (Has {{post}}) ---
    if (
      key === "topNavbar.moderation_message_deleted" ||
      key === "topNavbar.moderation_message_deleted_with_reason" ||
      key === "topNavbar.moderation_comment_deleted" ||
      key === "topNavbar.moderation_comment_deleted_with_reason" ||
      key === "topNavbar.warning_message_post"
    ) {
      const postTitle = params.post || "";
      const community = params.community || "";
      const reason = params.reason || "";

      const [beforePost, afterPostPart] = template.split("{{post}}");
      let remainingTemplate = afterPostPart || "";

      const postNode =
        params.postId && community ? (
          <Link
            href={`/${locale}/communities/${encodeURIComponent(community)}/${params.postId}`}
            className="text-foreground font-semibold hover:underline"
          >
            {postTitle}
          </Link>
        ) : (
          <span className="text-foreground font-semibold">{postTitle}</span>
        );

      let commNode = null;
      if (remainingTemplate.includes("{{community}}")) {
        const splitComm = remainingTemplate.includes("c/{{community}}")
          ? "c/{{community}}"
          : "{{community}}";
        const prefixComm = splitComm === "c/{{community}}" ? "c/" : "";
        const [beforeComm, afterComm] = remainingTemplate.split(splitComm);

        commNode = (
          <>
            {beforeComm}
            <Link
              href={`/${locale}/communities/${encodeURIComponent(community)}`}
              className="text-foreground font-semibold hover:underline"
            >
              {prefixComm}
              {community}
            </Link>
          </>
        );
        remainingTemplate = afterComm || "";
      }

      let reasonNode = null;
      if (
        key.includes("_with_reason") ||
        key === "topNavbar.warning_message_post"
      ) {
        const [beforeReason, afterReason] =
          remainingTemplate.split("{{reason}}");
        const labelMatch = beforeReason.match(/^(.*?)([^.?!]*:\s*)$/);

        reasonNode = (
          <>
            {labelMatch ? labelMatch[1] : beforeReason}
            {labelMatch && (
              <span className="text-foreground font-semibold">
                {labelMatch[2]}
              </span>
            )}
            {reason}
            {afterReason}
          </>
        );
        remainingTemplate = ""; // Consumed
      }

      return (
        <>
          {beforePost}
          {postNode}
          {commNode}
          {reasonNode || remainingTemplate}
        </>
      );
    }

    // --- User Warning (Has {{count}} but NO {{community}}) ---
    if (key === "topNavbar.admin_warning_message") {
      const [beforeCount, afterCount] = template.split("{{count}}");
      const count = params.count || "";
      return (
        <>
          {beforeCount}
          <span className="text-foreground font-semibold">{count}</span>
          {afterCount}
        </>
      );
    }

    // --- Community Action (Has {{community}} but NO {{post}}) ---
    if (
      key.includes("community_suspended") ||
      key.includes("community_reinstated") ||
      key.includes("community_deleted") ||
      key.includes("warning_message_community") ||
      key.includes("join_request_accepted") ||
      key.includes("join_request_declined") ||
      key.includes("member_muted") ||
      key.includes("member_kicked") ||
      key.includes("member_banned") ||
      key.includes("member_role_updated") ||
      key.includes("member_owner_transferred") ||
      key === "topNavbar.admin_warning_message_community"
    ) {
      const community = params.community || "";
      const splitComm = template.includes("c/{{community}}")
        ? "c/{{community}}"
        : "{{community}}";
      const prefixComm = splitComm === "c/{{community}}" ? "c/" : "";

      let beforeComm = template;
      let remainingTemplate = "";

      if (template.includes(splitComm)) {
        const parts = template.split(splitComm);
        beforeComm = parts[0];
        remainingTemplate = parts[1] || "";
      }

      const commNode = community ? (
        <Link
          href={`/${locale}/communities/${encodeURIComponent(community)}`}
          className="text-foreground font-semibold hover:underline"
        >
          {prefixComm}
          {community}
        </Link>
      ) : null;

      let countNode = null;
      if (remainingTemplate.includes("{{count}}")) {
        const count = params.count || "";
        const [beforeCount, afterCount] = remainingTemplate.split("{{count}}");
        countNode = (
          <>
            {beforeCount}
            <span className="text-foreground font-semibold">{count}</span>
          </>
        );
        remainingTemplate = afterCount || "";
      }

      let actorNode = null;
      if (remainingTemplate.includes("{{actor}}")) {
        const actor = params.actor || "";
        const splitActor = remainingTemplate.includes("u/{{actor}}")
          ? "u/{{actor}}"
          : "{{actor}}";
        const prefixActor = splitActor === "u/{{actor}}" ? "u/" : "";
        const [beforeActor, afterActor] = remainingTemplate.split(splitActor);

        actorNode = (
          <>
            {beforeActor}
            <Link
              href={`/${locale}/u/${encodeURIComponent(actor)}`}
              className="text-foreground font-semibold hover:underline"
            >
              {prefixActor}
              {actor}
            </Link>
          </>
        );
        remainingTemplate = afterActor || "";
      }

      let reasonNode = null;
      if (
        key.includes("_with_reason") ||
        key === "topNavbar.warning_message_community"
      ) {
        const reason = params.reason || "";
        const [beforeReason, afterReason] =
          remainingTemplate.split("{{reason}}");
        const labelMatch = beforeReason.match(/^(.*?)([^.?!]*:\s*)$/);

        reasonNode = (
          <>
            {labelMatch ? labelMatch[1] : beforeReason}
            {labelMatch && (
              <span className="text-foreground font-semibold">
                {labelMatch[2]}
              </span>
            )}
            {reason}
            {afterReason}
          </>
        );
        remainingTemplate = ""; // Consumed
      }

      return (
        <>
          {beforeComm}
          {commNode}
          {countNode}
          {actorNode}
          {reasonNode || remainingTemplate}
        </>
      );
    }

    if (key === "topNavbar.global_mute_message_with_reason") {
      const reason = params.reason || "";
      const [beforeReason, afterReason] = template.split("{{reason}}");
      const labelMatch = beforeReason.match(/^(.*?)([^.?!]*:\s*)$/);
      return (
        <>
          {labelMatch ? labelMatch[1] : beforeReason}
          {labelMatch && (
            <span className="!text-foreground font-semibold">
              {labelMatch[2]}
            </span>
          )}
          {reason}
          {afterReason}
        </>
      );
    }

    return fillI18nTemplate(template, params);
  }
  return notif.message;
};

export function NotificationsDropdown() {
  const { t, locale } = useTranslation();
  const { data: todayData } = useTodayStatus();

  // Hide unread badge while user is in low-energy mode.
  const isLowEnergyMode = !!todayData?.status && todayData.status.value <= 1;

  const { data: reqData, mutate: mutateReqs } = useSWR<FriendRequestsResponse>(
    "/api/users/requests",
    fetcher,
    { refreshInterval: 30000 },
  );

  const { data: notifData, mutate: mutateNotifs } = useSWR<{
    notifications: ApiNotification[];
  }>("/api/notifications", fetcher, {
    refreshInterval: 30000,
  });

  const pendingRequests = reqData?.requests ?? [];
  const notifications = notifData?.notifications ?? [];

  const handleRequest = async (id: string, action: "ACCEPT" | "DECLINE") => {
    try {
      await fetch(`/api/users/requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      mutateReqs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDismissNotification = async (id: string) => {
    // Optimistic update
    mutateNotifs((currentData) => {
      if (!currentData) return currentData;
      return {
        ...currentData,
        notifications: currentData.notifications.filter((n) => n.id !== id),
      };
    }, false);

    try {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      mutateNotifs();
    } catch (err) {
      console.error(err);
    }
  };

  const hasUnread =
    (pendingRequests.length > 0 || notifications.length > 0) &&
    !isLowEnergyMode;

  return (
    <DropdownMenu modal={false}>
      <Tooltip content={t("topNavbar.notifications")} side="bottom">
        <DropdownMenuTrigger asChild>
          <button
            className="relative h-10 w-10 flex items-center justify-center rounded-full hover:bg-foreground/8 text-foreground transition-colors cursor-pointer focus:outline-none"
            aria-label={t("topNavbar.notifications")}
          >
            <span className="flex items-center justify-center w-full h-full relative">
              <Bell className="h-5 w-5" />
              {hasUnread && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-brand" />
              )}
            </span>
          </button>
        </DropdownMenuTrigger>
      </Tooltip>
      <DropdownMenuContent
        align="end"
        className="w-80 overflow-hidden rounded-xl bg-background p-0"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-semibold font-heading text-foreground text-sm">
            {t("topNavbar.notifications")}
          </span>
        </div>
        <DropdownMenuSeparator className="m-0 bg-surface-border" />

        <ScrollArea maxHeight="360px">
          <div>
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className="flex flex-col gap-2 px-4 py-3 border-b border-surface-border/50 bg-foreground/[0.02]"
              >
                <div className="flex items-start gap-3">
                  <div className="relative flex-shrink-0 mt-0.5">
                    {renderNotificationIcon(notif)}
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-foreground truncate">
                        {renderNotificationTitle(notif, t)}
                      </p>
                      <button
                        onClick={() => handleDismissNotification(notif.id)}
                        className="text-foreground-40 hover:text-foreground transition-colors p-1 -mr-1 rounded-full cursor-pointer"
                        title={t("topNavbar.dismiss")}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-xs leading-relaxed text-foreground-67 break-words">
                      {renderNotificationMessage(notif, t, locale)}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="flex flex-col gap-2 px-4 py-3 border-b border-surface-border/50"
              >
                <div className="flex items-start gap-3">
                  <div className="relative flex-shrink-0">
                    <Avatar
                      className="h-9 w-9 ring-2 ring-offset-2 ring-offset-background"
                      style={
                        {
                          "--tw-ring-color": getMoodRingColor(
                            req.sender.dailyStatuses?.[0]?.value,
                          ),
                        } as React.CSSProperties
                      }
                    >
                      {req.sender.image ? (
                        <AvatarImage src={req.sender.image} />
                      ) : req.sender.avatarBgColor ? (
                        <IconAvatar
                          emoji={req.sender.avatarEmoji}
                          bgColor={req.sender.avatarBgColor}
                          emojiSizeClass="text-2xl"
                        />
                      ) : (
                        <AvatarFallback>
                          {(req.sender.username ?? req.sender.name ?? "?")
                            .charAt(0)
                            .toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>

                    <div className="absolute -bottom-0.5 -right-0.5">
                      <div className="h-4 w-4 rounded-full bg-brand flex items-center justify-center">
                        <UserPlus className="h-2.5 w-2.5 text-white" />
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2 min-w-0">
                    <p className="text-sm font-bold text-foreground">
                      <Link
                        href={`/${locale}/u/${encodeURIComponent(req.sender?.username ?? "")}`}
                        className="text-foreground-67 hover:underline"
                      >
                        u/{req.sender?.username}
                      </Link>{" "}
                      {t("topNavbar.friend_request")}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRequest(req.id, "ACCEPT")}
                        className="flex-1 py-1.5 rounded-full bg-brand text-white text-xs font-bold hover:bg-brand/90 transition-colors cursor-pointer"
                      >
                        {t("topNavbar.accept")}
                      </button>
                      <button
                        onClick={() => handleRequest(req.id, "DECLINE")}
                        className="flex-1 py-1.5 rounded-full border border-surface-border text-foreground-60 text-xs font-bold hover:bg-foreground/5 transition-colors cursor-pointer"
                      >
                        {t("topNavbar.decline")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {pendingRequests.length === 0 && notifications.length === 0 && (
              <div className="py-8 text-center text-sm font-medium text-foreground-40">
                {t("topNavbar.no_notifications")}
              </div>
            )}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
