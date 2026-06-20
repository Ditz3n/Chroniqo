// src/app/[locale]/(protected)/create/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import {
  ApiCommunity,
  ApiPostDraft,
  CommunitiesOverviewData,
  Destination,
  PostTypeTab,
} from "@/types/app-types";
import {
  ImageIcon,
  Link2,
  ListOrdered,
  MicOff,
  Video,
  Youtube,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { CreatePostSidebar } from "./(components)/create-post-sidebar";
import { DestinationSelector } from "./(components)/destination-selector";
import { DraftsModal } from "./(components)/drafts-modal";
import { ImagePostForm } from "./(components)/image-post-form";
import { LinkPostForm } from "./(components)/link-post-form";
import { PollPostForm } from "./(components)/poll-post-form";
import { TextPostForm } from "./(components)/text-post-form";
import { VideoPostForm } from "./(components)/video-post-form";
import { YoutubePostForm } from "./(components)/youtube-post-form";

export default function CreatePostPage() {
  const { mutate } = useSWRConfig();
  const { data: session } = useSession();
  const { t, locale } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const communityParam = searchParams.get("c");

  const [destination, setDestination] = useState<Destination>({
    type: communityParam ? "community" : "profile",
    id: communityParam ? "loading..." : null,
    name: communityParam || "Your Profile",
  });

  const [activeTab, setActiveTab] = useState<PostTypeTab>("text");

  const [draftId, setDraftId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [metadata, setMetadata] = useState<Record<string, unknown> | null>(
    null,
  );

  // Unified metadata handler for all new tabs
  const handleMetadataChange = useCallback((meta: Record<string, unknown>) => {
    setMetadata((prev) => ({ ...prev, ...meta }));
  }, []);

  const [isDraftsModalOpen, setIsDraftsModalOpen] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch mute status
  const { data: muteData } = useSWR<{
    isMuted: boolean;
    expiresAt: string | null;
  }>(
    "/api/user/mute-status",
    (url: string) => fetch(url).then((r) => r.json()),
    { refreshInterval: 60_000 },
  );
  const isMuted = muteData?.isMuted ?? false;

  const { data: comData } = useSWR<CommunitiesOverviewData>(
    "/api/communities",
    (url: string) => fetch(url).then((res) => res.json()),
  );

  useEffect(() => {
    if (communityParam && comData) {
      const allComms = [...(comData.joined || []), ...(comData.all || [])];
      const matched = allComms.find(
        (c: ApiCommunity) => c.name === communityParam,
      );

      if (matched) {
        const isJoined = (comData.joined || []).some(
          (jc: ApiCommunity) => jc.id === matched.id,
        );
        if (matched.isPrivate && !isJoined) {
          setDestination({ type: "profile", id: null, name: "Your Profile" });
        } else {
          setDestination({
            type: "community",
            id: matched.id,
            name: matched.name,
            image: matched.image,
            rules: matched.rules,
          });
        }
      } else {
        setDestination({ type: "profile", id: null, name: "Your Profile" });
      }
    }
  }, [communityParam, comData]);

  const handleSelectDraft = (draft: ApiPostDraft) => {
    setDraftId(draft.id);
    setTitle(draft.title || "");
    setContent(draft.content || "");
    setMetadata(draft.metadata as Record<string, unknown> | null);
    setActiveTab((draft.type as PostTypeTab) || "text");

    if (draft.communityId && draft.community) {
      setDestination({
        type: "community",
        id: draft.community.id,
        name: draft.community.name,
        image: draft.community.image,
      });
    } else {
      setDestination({ type: "profile", id: null, name: "Your Profile" });
    }
  };

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const payload = {
        id: draftId || undefined,
        title,
        type: activeTab,
        communityId: destination.type === "community" ? destination.id : null,
        content,
        metadata,
      };

      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save draft");

      const data = await res.json();
      setDraftId(data.draft.id);
      setSuccessMsg(t("createPost.draft_saved"));
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving draft");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handlePost = async () => {
    setIsPosting(true);
    setError(null);
    try {
      if (!title.trim()) throw new Error("Title is required");

      const payload = {
        title,
        type: activeTab,
        communityId: destination.type === "community" ? destination.id : null,
        content,
        metadata,
        isAnonymous,
      };

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to post");

      if (draftId) {
        await fetch(`/api/drafts/${draftId}`, { method: "DELETE" });
      }

      mutate(
        (key) => typeof key === "string" && key.includes("/api/"),
        undefined,
        { revalidate: true },
      );

      // expect the API to return the created post under data.post or similar.
      // If it returns the post ID, navigate to the specific post.
      const postId = data.id || data.post?.id;

      if (destination.type === "community") {
        if (postId) {
          router.push(
            `/${locale}/communities/${encodeURIComponent(destination.name)}/${postId}`,
          );
        } else {
          router.push(
            `/${locale}/communities/${encodeURIComponent(destination.name)}`,
          );
        }
      } else {
        // For profile posts
        if (postId && session?.user?.username) {
          router.push(`/${locale}/u/${session.user.username}/${postId}`);
        } else {
          router.push(`/${locale}/feed`);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error posting");
      setIsPosting(false);
    }
  };

  const tabs = [
    { id: "text", label: t("createPost.tab_text"), icon: null },
    { id: "image", label: t("createPost.tab_image"), icon: ImageIcon },
    { id: "video", label: t("createPost.tab_video"), icon: Video },
    { id: "link", label: t("createPost.tab_link"), icon: Link2 },
    { id: "poll", label: t("createPost.tab_poll"), icon: ListOrdered },
    { id: "youtube", label: "YouTube", icon: Youtube },
  ] as const;

  return (
    <div className="flex w-full min-h-full justify-center pb-12 pt-6">
      <div className="flex flex-col w-full max-w-[1100px] px-4 sm:px-6 mx-auto">
        {/* Header & Drafts */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold font-heading text-foreground">
            {t("createPost.title")}
          </h1>
          <div className="flex items-center gap-3">
            {successMsg && (
              <span className="text-sm font-bold text-brand animate-in fade-in">
                {successMsg}
              </span>
            )}
            <Button
              variant="outline"
              onClick={() => setIsDraftsModalOpen(true)}
              className="rounded-full px-5 py-2.5 h-auto text-sm"
            >
              {t("createPost.drafts")}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 min-[1080px]:grid-cols-[1fr_312px] gap-8 w-full">
          {/* Main Form Column */}
          <div className="flex flex-col gap-6 w-full order-2 min-[1080px]:order-1">
            {/* Global mute banner - shown instead of (or above) the form */}
            {isMuted && (
              <div className="flex items-center gap-3 p-4 bg-warning/10 border border-warning/30 rounded-2xl">
                <MicOff className="h-5 w-5 text-warning shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-warning">
                    {t("createPost.muted_banner_title")}
                  </span>
                  <span className="text-xs text-warning/80">
                    {t("createPost.muted_banner_desc")}
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 text-sm text-white bg-brand rounded-xl font-medium">
                {error}
              </div>
            )}

            {/* Destination */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold text-foreground">
                {t("createPost.destination")}
              </span>
              <DestinationSelector
                value={destination}
                onChange={(dest) => {
                  setDestination(dest);
                  if (dest.type === "profile") setIsAnonymous(false);
                }}
              />
            </div>

            {/* Tabs */}
            <div className="flex overflow-x-auto no-scrollbar border-b border-surface-border">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as PostTypeTab);
                    setMetadata(null); // Clear metadata when switching to avoid weird overlaps
                  }}
                  className={cn(
                    "flex items-center gap-2 px-5 py-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 outline-none cursor-pointer",
                    activeTab === tab.id
                      ? "border-brand text-foreground"
                      : "border-transparent text-foreground-60 hover:text-foreground",
                  )}
                >
                  {tab.icon && <tab.icon className="h-4 w-4" />}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Form Area */}
            <div className="flex-1">
              {activeTab === "text" && (
                <TextPostForm
                  title={title}
                  setTitle={setTitle}
                  content={content}
                  setContent={setContent}
                />
              )}
              {activeTab === "poll" && (
                <PollPostForm
                  title={title}
                  setTitle={setTitle}
                  content={content}
                  setContent={setContent}
                  metadata={metadata}
                  setMetadata={handleMetadataChange}
                />
              )}
              {activeTab === "youtube" && (
                <YoutubePostForm
                  title={title}
                  setTitle={setTitle}
                  content={content}
                  setContent={setContent}
                  metadata={metadata}
                  setMetadata={handleMetadataChange}
                />
              )}
              {activeTab === "link" && (
                <LinkPostForm
                  title={title}
                  setTitle={setTitle}
                  content={content}
                  setContent={setContent}
                  metadata={metadata}
                  setMetadata={handleMetadataChange}
                />
              )}
              {activeTab === "image" && (
                <ImagePostForm
                  title={title}
                  setTitle={setTitle}
                  content={content}
                  setContent={setContent}
                  metadata={metadata}
                  setMetadata={handleMetadataChange}
                />
              )}
              {activeTab === "video" && (
                <VideoPostForm
                  title={title}
                  setTitle={setTitle}
                  content={content}
                  setContent={setContent}
                  metadata={metadata}
                  setMetadata={handleMetadataChange}
                />
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-surface-border">
              <div className="flex items-start gap-3 w-full sm:w-auto">
                <Checkbox
                  id="isAnonymous"
                  checked={isAnonymous}
                  onCheckedChange={(c) => setIsAnonymous(c as boolean)}
                  disabled={destination.type === "profile"}
                  className="mt-0.5"
                />
                <div className="flex flex-col">
                  <label
                    htmlFor="isAnonymous"
                    className={cn(
                      "text-sm font-bold cursor-pointer",
                      destination.type === "profile"
                        ? "text-foreground-40"
                        : "text-foreground",
                    )}
                  >
                    {t("createPost.anonymous_toggle")}
                  </label>
                  <span className="text-xs text-foreground-60 max-w-[250px]">
                    {t("createPost.anonymous_desc")}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button
                  variant="ghost"
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft || isPosting || !title.trim()}
                  className="flex-1 sm:flex-none px-6 rounded-full cursor-pointer h-auto py-2.5 text-sm font-bold"
                >
                  {isSavingDraft ? "..." : t("createPost.draft_save")}
                </Button>
                <Button
                  onClick={handlePost}
                  disabled={
                    isPosting ||
                    isSavingDraft ||
                    !title.trim() ||
                    destination.id === "loading..." ||
                    isMuted ||
                    (activeTab === "youtube" && !metadata?.videoId) ||
                    (activeTab === "link" && !metadata?.url) ||
                    (activeTab === "image" &&
                      (!metadata?.images ||
                        (metadata.images as string[]).length === 0)) ||
                    (activeTab === "video" && !metadata?.videoUrl)
                  }
                  className="flex-1 sm:flex-none px-8 rounded-full cursor-pointer h-auto py-2.5 text-sm font-bold"
                >
                  {isPosting
                    ? t("createPost.posting")
                    : t("createPost.post_button")}
                </Button>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="order-1 min-[1080px]:order-2">
            <CreatePostSidebar destination={destination} />
          </div>
        </div>

        <DraftsModal
          isOpen={isDraftsModalOpen}
          onClose={() => setIsDraftsModalOpen(false)}
          onSelectDraft={handleSelectDraft}
        />
      </div>
    </div>
  );
}
