// src/app/[locale]/(protected)/communities/[name]/(components)/transfer-ownership-leave-modal.tsx
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import {
  ApiCommunityMember,
  TransferOwnershipLeaveModalProps,
} from "@/types/app-types";
import { AlertTriangle, Crown, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

function renderConfirmText(
  template: string,
  memberDisplayName: string,
  selectedMember: ApiCommunityMember | null,
  t: (key: string) => string,
) {
  const parts = template.split("{{member}}");
  return (
    <span className="text-sm text-foreground-67 leading-relaxed">
      {parts[0]}
      {selectedMember ? (
        <span className="text-foreground font-semibold">
          {memberDisplayName}
        </span>
      ) : (
        <span>{t("communityPage.transfer_modal_confirm_default")}</span>
      )}
      {parts.slice(1).join("{{member}}")}
    </span>
  );
}

export function TransferOwnershipLeaveModal({
  isOpen,
  onClose,
  communityName,
  onSuccess,
}: TransferOwnershipLeaveModalProps) {
  const { t } = useTranslation();

  const [members, setMembers] = useState<ApiCommunityMember[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const [isFetchingMembers, setIsFetchingMembers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [phase, setPhase] = useState<"idle" | "success">("idle");
  const [successOpacity, setSuccessOpacity] = useState(0);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const loadMembers = async () => {
      setIsFetchingMembers(true);
      setError(null);
      setSelectedUserId(null);
      setConfirmTransfer(false);

      try {
        const res = await fetch(
          `/api/communities/${encodeURIComponent(communityName)}/members`,
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error || "Failed to load members");

        const membersData = body?.members?.members || body?.members || [];
        const membersArray = Array.isArray(membersData) ? membersData : [];
        const eligible = (membersArray as ApiCommunityMember[]).filter(
          (member) => member.status === "ACCEPTED" && member.role !== "OWNER",
        );
        setMembers(eligible);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load community members",
        );
      } finally {
        setIsFetchingMembers(false);
      }
    };

    loadMembers();
  }, [isOpen, communityName]);

  const selectedMember = useMemo(
    () => members.find((member) => member.user.id === selectedUserId) || null,
    [members, selectedUserId],
  );

  const canSubmit = !!selectedMember && confirmTransfer && !isSubmitting;
  const selectedMemberDisplayName =
    selectedMember?.user.name ??
    selectedMember?.user.username ??
    t("communityPage.transfer_modal_confirm_default") ??
    "";
  const confirmTextTemplate =
    t("communityPage.transfer_modal_confirm_text") ?? "";

  const handleClose = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    setPhase("idle");
    setSuccessOpacity(0);
    setIsTransitioning(false);
    onClose();
  };

  const handleTransferAndLeave = async () => {
    if (!selectedMember || !confirmTransfer || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const transferRes = await fetch(
        `/api/communities/${encodeURIComponent(communityName)}/members/${selectedMember.user.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "OWNER" }),
        },
      );
      const transferBody = await transferRes.json().catch(() => ({}));
      if (!transferRes.ok) {
        throw new Error(
          transferBody?.error ||
            "Failed to transfer ownership. Please try again.",
        );
      }

      const leaveRes = await fetch(
        `/api/communities/${encodeURIComponent(communityName)}/join`,
        { method: "POST" },
      );
      const leaveBody = await leaveRes.json().catch(() => ({}));
      if (!leaveRes.ok) {
        throw new Error(
          leaveBody?.error || "Ownership transferred, but leaving failed.",
        );
      }

      setIsTransitioning(true);
      setPhase("success");

      successTimeoutRef.current = setTimeout(() => {
        setSuccessOpacity(1);
      }, 300);

      closeTimeoutRef.current = setTimeout(() => {
        onSuccess();
        onClose();
      }, 1900);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to complete action",
      );
      setIsSubmitting(false);
    }
  };

  const show = phase === "idle";

  const gridInnerStyle: React.CSSProperties = {
    overflow: "clip",
    minHeight: 0,
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) =>
        !open && !isSubmitting && !isTransitioning && handleClose()
      }
    >
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0 bg-background border-surface-border">
        <DialogHeader className="bg-surface py-4 px-6 border-b border-surface-border">
          <DialogTitle className="font-bold text-foreground">
            {t("communityPage.transfer_modal_title")}
          </DialogTitle>
        </DialogHeader>

        <DialogBody style={{ overflowY: "hidden" }}>
          {/* Form */}
          <div
            style={{
              display: "grid",
              gridTemplateRows: show ? "1fr" : "0fr",
              transition: "grid-template-rows 300ms ease-in-out",
            }}
          >
            <div style={gridInnerStyle}>
              <div
                className="px-4 pt-4 pb-8"
                style={{
                  opacity: show ? 1 : 0,
                  transition: "opacity 150ms ease-in-out",
                }}
              >
                <div className="flex flex-col gap-5">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-brand/10 border border-brand/20">
                    <AlertTriangle className="h-5 w-5 text-brand shrink-0" />
                    <p className="text-xs font-semibold text-brand/90 leading-relaxed">
                      {t("communityPage.transfer_modal_warning")}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-foreground-40" />
                      <h3 className="text-sm font-bold uppercase tracking-wider text-foreground-40">
                        {t("communityPage.transfer_modal_select_label")}
                      </h3>
                    </div>

                    <div className="bg-surface/40 border border-surface-border rounded-xl">
                      <ScrollArea className="w-full" maxHeight="240px">
                        {isFetchingMembers ? (
                          <div className="p-4 text-sm text-foreground-60">
                            {t("communityPage.transfer_modal_loading")}
                          </div>
                        ) : members.length === 0 ? (
                          <div className="p-4 text-sm text-foreground-60">
                            {t("communityPage.transfer_modal_no_eligible")}
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            {members.map((member) => {
                              const isSelected =
                                selectedUserId === member.user.id;
                              return (
                                <button
                                  key={member.user.id}
                                  type="button"
                                  onClick={() =>
                                    setSelectedUserId((prev) =>
                                      prev === member.user.id
                                        ? null
                                        : member.user.id,
                                    )
                                  }
                                  className={cn(
                                    "w-full px-4 py-3 flex items-center gap-3 text-left transition-colors cursor-pointer rounded-xl border-2",
                                    isSelected
                                      ? "bg-brand/10 border-brand"
                                      : "hover:bg-foreground/5 text-foreground-60 border-transparent",
                                  )}
                                >
                                  <Avatar className="h-8 w-8 border border-surface-border">
                                    {member.user.image && (
                                      <AvatarImage src={member.user.image} />
                                    )}
                                    <AvatarFallback className="text-xs bg-background text-foreground">
                                      {member.user.username?.[0]?.toUpperCase() ||
                                        "U"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col min-w-0 flex-1">
                                    <span className="text-sm font-semibold text-foreground truncate flex items-center gap-1">
                                      {member.user.name || member.user.username}
                                      {member.user.emailVerified && (
                                        <VerifiedBadge className="h-3.5 w-3.5" />
                                      )}
                                    </span>
                                    <span className="text-xs text-foreground-60 truncate">
                                      u/{member.user.username}
                                    </span>
                                  </div>
                                  {isSelected && (
                                    <Crown className="h-4 w-4 text-brand" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </div>

                  <label className="flex items-center gap-3 p-4 rounded-xl border border-surface-border bg-surface cursor-pointer">
                    <Checkbox
                      checked={confirmTransfer}
                      onCheckedChange={(checked) =>
                        setConfirmTransfer(!!checked)
                      }
                    />
                    {renderConfirmText(
                      confirmTextTemplate,
                      selectedMemberDisplayName,
                      selectedMember,
                      t,
                    )}
                  </label>

                  {error && (
                    <div className="p-3 rounded-xl bg-brand/10 border border-brand/20 text-sm text-brand font-medium">
                      {error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Success */}
          <div
            style={{
              display: "grid",
              gridTemplateRows: !show ? "1fr" : "0fr",
              transition: "grid-template-rows 300ms ease-in-out",
            }}
          >
            <div style={gridInnerStyle}>
              <div
                className="flex flex-col items-center justify-center pt-6 pb-10 gap-4"
                style={{
                  opacity: successOpacity,
                  transition: "opacity 300ms ease-in-out",
                }}
              >
                <p className="text-foreground font-bold text-lg text-center">
                  {t("communityPage.transfer_success_message").replace(
                    "{{target}}",
                    selectedMemberDisplayName,
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className="-mx-4 -mb-4"
            style={{
              display: "grid",
              gridTemplateRows: show ? "1fr" : "0fr",
              transition: "grid-template-rows 300ms ease-in-out",
            }}
          >
            <div style={gridInnerStyle}>
              <div
                className="flex items-center justify-end gap-3 px-4 py-3 border-t border-surface-border bg-surface"
                style={{
                  opacity: show ? 1 : 0,
                  transition: "opacity 150ms ease-in-out",
                  pointerEvents: show ? "auto" : "none",
                }}
              >
                <Button
                  variant="ghost"
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="text-foreground-60 hover:text-foreground hover:bg-transparent"
                >
                  {t("communitiesPage.cancel")}
                </Button>
                <Button
                  type="button"
                  onClick={handleTransferAndLeave}
                  disabled={!canSubmit}
                  variant="brand"
                >
                  {isSubmitting
                    ? t("communityPage.transfer_modal_button_loading")
                    : t("communityPage.transfer_modal_button_text")}
                </Button>
              </div>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
