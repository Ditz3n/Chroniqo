// src/components/ui/report-modal.tsx
"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  IconAvatar,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/lib/hooks/use-translation";
import { ReportModalProps } from "@/types/app-types";
import { useEffect, useRef, useState } from "react";

export function ReportModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
  targetAuthorName,
  communityContextId,
  postContextId,
  commentContextId,
  targetContent,
  targetImage,
  targetAvatarEmoji,
  targetAvatarBgColor,
}: ReportModalProps) {
  const { t } = useTranslation();
  const descriptionTemplate = t("reporting.description");
  const [descriptionBeforeTarget, descriptionAfterTarget] =
    descriptionTemplate.split("{{target}}");
  const normalizedTargetName = targetName.replace(/^u\//, "");
  const normalizedTargetAuthorName = targetAuthorName?.replace(/^u\//, "");
  const displayTargetName =
    targetType === "USER" ? `u/${normalizedTargetName}` : targetName;
  const displayCommunityName = targetName.startsWith("c/")
    ? targetName
    : `c/${targetName}`;
  const scopeLabel = communityContextId
    ? t("reporting.community")
    : t("reporting.global");
  const titleAuthorName = normalizedTargetAuthorName || normalizedTargetName;
  const titleTargetText =
    targetType === "COMMENT" ? targetContent || targetName : targetName;

  const [reason, setReason] = useState("");
  const [blockUser, setBlockUser] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [phase, setPhase] = useState<"idle" | "success">("idle");
  const [successOpacity, setSuccessOpacity] = useState(0);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reasonMaxChars = Number(t("reporting.reason_max_chars"));
  const reasonCounterText = t("reporting.reason_counter")
    .replace("{{current}}", String(reason.length))
    .replace("{{max}}", String(reasonMaxChars));

  const resetState = () => {
    setReason("");
    setBlockUser(false);
    setError(null);
    setIsLoading(false);
    setIsTransitioning(false);
    setPhase("idle");
    setSuccessOpacity(0);
  };

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  // Only runs the async fetch - sync resets are handled by resetState in handleClose
  useEffect(() => {
    if (!isOpen) return;

    const fetchExistingReport = async () => {
      setIsFetching(true);
      try {
        const query = new URLSearchParams({ targetType, targetId });
        if (communityContextId)
          query.set("communityContextId", communityContextId);
        if (postContextId) query.set("postContextId", postContextId);
        if (commentContextId) query.set("commentContextId", commentContextId);

        const res = await fetch(`/api/reports?${query.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.report?.reason) setReason(data.report.reason);
        }
      } catch (err) {
        console.error("Failed to fetch existing report", err);
      } finally {
        setIsFetching(false);
      }
    };

    void fetchExistingReport();
  }, [
    isOpen,
    targetType,
    targetId,
    communityContextId,
    postContextId,
    commentContextId,
  ]);

  const handleClose = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    resetState();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.length < 10) {
      setError(t("reporting.reason_too_short"));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetId,
          communityContextId,
          postContextId,
          commentContextId,
          reason,
          blockUser: targetType === "USER" ? blockUser : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit report");

      setIsTransitioning(true);
      setPhase("success");

      successTimeoutRef.current = setTimeout(() => {
        setSuccessOpacity(1);
      }, 300);

      closeTimeoutRef.current = setTimeout(() => {
        onClose();
        resetState();
      }, 1900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
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
        !open && !isLoading && !isTransitioning && handleClose()
      }
    >
      <DialogContent className="bg-background p-0 overflow-hidden gap-0 sm:max-w-md">
        <DialogHeader className="bg-surface py-4">
          <DialogTitle className="font-bold min-w-0">
            <span className="flex items-center gap-0 min-w-0 max-w-full overflow-hidden whitespace-nowrap text-left">
              <span className="shrink-0">
                {t("reporting.title_prefix")}&nbsp;
              </span>
              {targetType === "USER" ? (
                <>
                  <span className="min-w-0 max-w-[58%] truncate">
                    {displayTargetName}
                  </span>
                  <span className="shrink-0">&nbsp;({scopeLabel})</span>
                </>
              ) : targetType === "COMMUNITY" ? (
                <>
                  <span className="min-w-0 max-w-[58%] truncate">
                    {displayCommunityName}
                  </span>
                  <span className="shrink-0">&nbsp;({scopeLabel})</span>
                </>
              ) : (
                <>
                  <span className="shrink-0">&quot;</span>
                  <span className="min-w-0 max-w-[38%] truncate">
                    {titleTargetText}
                  </span>
                  <span className="shrink-0">&quot;</span>
                  <span className="shrink-0">
                    &nbsp;{t("reporting.from")}&nbsp;
                  </span>
                  <span className="min-w-0 max-w-[34%] truncate">
                    u/{titleAuthorName}
                  </span>
                  <span className="shrink-0">&nbsp;({scopeLabel})</span>
                </>
              )}
            </span>
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
                <form
                  id="report-form"
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-5"
                >
                  <p className="text-sm text-foreground-60">
                    {descriptionTemplate.includes("{{target}}") ? (
                      targetType === "POST" && titleAuthorName ? (
                        <>
                          {descriptionBeforeTarget}
                          <span className="text-foreground font-semibold">
                            {targetContent || targetName}
                          </span>
                          <span className="text-foreground-60">
                            &nbsp;{t("reporting.from")}&nbsp;
                          </span>
                          <span className="text-foreground font-semibold">
                            u/{titleAuthorName}
                          </span>
                          {descriptionAfterTarget}
                        </>
                      ) : targetType === "COMMENT" ? (
                        <>
                          {descriptionBeforeTarget}
                          <span className="text-foreground font-semibold">
                            u/{normalizedTargetName}
                          </span>
                          <span className="text-foreground-60">
                            &nbsp;{t("reporting.and_their")}&nbsp;
                          </span>
                          <span className="text-foreground font-semibold">
                            {t("reporting.comment")}
                          </span>
                          {descriptionAfterTarget}
                        </>
                      ) : (
                        <>
                          {descriptionBeforeTarget}
                          <span className="text-foreground font-semibold">
                            {displayTargetName}
                          </span>
                          {descriptionAfterTarget}
                        </>
                      )
                    ) : (
                      descriptionTemplate
                    )}
                  </p>

                  {error && (
                    <div className="p-3 text-sm text-white bg-brand rounded-xl font-medium">
                      {error}
                    </div>
                  )}

                  {targetContent && (
                    <div className="p-4 bg-surface border border-surface-border rounded-xl mb-1 flex gap-3">
                      <Avatar className="h-8 w-8 border border-surface-border shrink-0 mt-0.5 bg-background">
                        {targetImage ? (
                          <AvatarImage src={targetImage} />
                        ) : targetAvatarBgColor ? (
                          <IconAvatar
                            emoji={targetAvatarEmoji}
                            bgColor={targetAvatarBgColor}
                            emojiSizeClass="text-xl"
                          />
                        ) : (
                          <AvatarFallback className="text-xs font-bold bg-brand/20 text-brand">
                            {displayTargetName
                              .replace("u/", "")
                              .charAt(0)
                              .toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-foreground">
                          {displayTargetName}
                        </span>
                        <span className="text-sm text-foreground-67 mt-0.5 line-clamp-3">
                          {targetContent}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="relative rounded-xl border border-surface-border transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-inset focus-within:ring-brand">
                    <textarea
                      id="report-reason"
                      rows={4}
                      placeholder=" "
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      maxLength={reasonMaxChars}
                      disabled={isFetching || isLoading}
                      className="peer w-full px-4 pt-6 pb-3 rounded-xl bg-transparent text-foreground focus:outline-none appearance-none transition-all resize-none text-sm"
                    />
                    <label
                      htmlFor="report-reason"
                      className="absolute left-3 top-4 text-sm text-foreground-60 transition-all duration-200 pointer-events-none px-1 bg-background peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-brand peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs"
                    >
                      {t("reporting.reason_label")}
                    </label>
                    <div className="absolute bottom-2 right-3 text-xs text-foreground-40 font-medium">
                      {reasonCounterText}
                    </div>
                  </div>

                  <p
                    className={`-mt-2 text-xs transition-colors duration-200 ${
                      reason.length > 0 && reason.length < 10
                        ? "text-brand"
                        : "text-foreground-40"
                    }`}
                  >
                    {t("reporting.min_chars_hint")}
                  </p>

                  {targetType === "USER" && (
                    <div className="flex items-center gap-3 p-4 rounded-xl border border-surface-border bg-surface">
                      <Checkbox
                        id="block-user"
                        checked={blockUser}
                        onCheckedChange={(c) => setBlockUser(c as boolean)}
                      />
                      <div className="flex flex-col gap-1">
                        <label
                          htmlFor="block-user"
                          className="text-sm font-bold text-foreground cursor-pointer"
                        >
                          {t("reporting.block_user_prompt").replace(
                            "{{user}}",
                            normalizedTargetName,
                          )}
                        </label>
                        <span className="text-xs text-foreground-60">
                          {t("reporting.block_user_desc")}
                        </span>
                      </div>
                    </div>
                  )}
                </form>
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
                  {t("reporting.success_message")}
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
                  disabled={isLoading || isTransitioning}
                  className="text-foreground-60 hover:text-foreground hover:bg-transparent"
                >
                  {t("reporting.cancel")}
                </Button>
                <Button
                  form="report-form"
                  type="submit"
                  variant="brand"
                  disabled={
                    isLoading ||
                    isFetching ||
                    reason.length < 10 ||
                    isTransitioning
                  }
                >
                  {isLoading
                    ? t("reporting.submitting")
                    : t("reporting.submit")}
                </Button>
              </div>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
