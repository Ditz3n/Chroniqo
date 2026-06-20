// src/app/[locale]/(protected)/(components)/posts/video-post.tsx
"use client";

import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { VideoPostProps as BaseVideoPostProps } from "@/types/app-types";
import {
  Eye,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { MarkdownRenderer } from "./markdown-renderer";
import { PostActions } from "./post-actions";
import { PostHeader } from "./post-header";

type VideoPostProps = BaseVideoPostProps & { isPriority?: boolean };

function formatTime(seconds: number) {
  if (isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VideoPlayer({
  videoUrl,
  thumbnailUrl,
  duration: initialDuration,
  spoiler,
  compact = false,
  isPriority = false,
}: {
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  spoiler?: boolean;
  compact?: boolean;
  isPriority?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [prevVolume, setPrevVolume] = useState(0.8);
  const [showVolume, setShowVolume] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [revealed, setRevealed] = useState(!spoiler);
  const [showControls, setShowControls] = useState(true);
  const [ended, setEnded] = useState(false);

  const volumeHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { t } = useTranslation();

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (playing && !ended) {
      hideTimer.current = setTimeout(() => setShowControls(false), 2500);
    }
  }, [playing, ended]);

  // Native wheel listener on volume button
  useEffect(() => {
    const el = volumeRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (!showVolume) return;
      e.preventDefault();
      const delta = -e.deltaY / 1000;
      setVolume((v) => {
        const next = Math.max(0, Math.min(1, v + delta));
        if (videoRef.current) {
          videoRef.current.volume = next;
          videoRef.current.muted = next === 0;
        }
        setPrevVolume(next > 0 ? next : v);
        setMuted(next === 0);
        return next;
      });
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [showVolume]);

  // Fullscreen change listener
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const isMuted = !m;
      if (videoRef.current) {
        videoRef.current.muted = isMuted;
        if (!isMuted) {
          videoRef.current.volume = prevVolume > 0 ? prevVolume : 0.8;
          setVolume(prevVolume > 0 ? prevVolume : 0.8);
        } else {
          setVolume(0);
        }
      }
      return isMuted;
    });
  }, [prevVolume]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (ended) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    } else if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  }, [ended, playing]);

  // Keyboard shortcuts - only active when this player is in fullscreen
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!isFullscreen) return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      }
      if (e.code === "KeyM") {
        toggleMute();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isFullscreen, toggleMute, togglePlay]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const displayVolume = muted ? 0 : volume;

  const handleVolumeChange = (clientY: number, rect: DOMRect) => {
    const ratio = 1 - (clientY - rect.top) / rect.height;
    const v = Math.max(0, Math.min(1, ratio));
    setVolume(v);
    if (videoRef.current) {
      videoRef.current.volume = v;
      videoRef.current.muted = v === 0;
    }
    if (v > 0) {
      setPrevVolume(v);
      setMuted(false);
    } else {
      setMuted(true);
    }
  };

  const VolumeIcon =
    displayVolume === 0 ? VolumeX : displayVolume < 0.5 ? Volume1 : Volume2;

  // In compact mode, don't render the video at all to save bandwidth. Just the thumbnail.
  if (compact) {
    return (
      <div className="relative aspect-square self-stretch max-h-20 min-w-[3rem] rounded-xl overflow-hidden flex-shrink-0 bg-black cursor-pointer group">
        <Image
          src={thumbnailUrl}
          alt=""
          fill
          priority={isPriority}
          sizes="80px"
          className="object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/50 transition-colors">
          <div className="h-6 w-6 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="h-3 w-3 text-black ml-0.5" fill="black" />
          </div>
        </div>
        <div className="absolute bottom-1 right-1 bg-black/70 rounded px-1 text-[9px] font-bold text-white">
          {formatTime(duration)}
        </div>
        <div
          className={cn(
            "absolute inset-0 z-10 bg-black/80 backdrop-blur-md flex items-center justify-center rounded-xl cursor-pointer transition-all duration-300",
            revealed && "opacity-0 pointer-events-none",
          )}
          onClick={(e) => {
            e.stopPropagation();
            setRevealed(true);
          }}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={resetHideTimer}
      onMouseLeave={() => playing && setShowControls(false)}
      className={cn(
        "relative bg-black overflow-hidden cursor-pointer select-none",
        isFullscreen ? "w-full h-full" : "aspect-video",
      )}
    >
      {/* Blurred bg fill */}
      <div className="absolute inset-0 scale-110 blur-xl brightness-40 z-0 overflow-hidden">
        <Image
          src={thumbnailUrl}
          alt=""
          fill
          priority={isPriority}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
        />
      </div>

      {/* Sharp poster overlay (since preload=none, video is transparent before play) */}
      <Image
        src={thumbnailUrl}
        alt=""
        fill
        priority={isPriority}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className={cn(
          "object-contain z-0 transition-opacity duration-300",
          !revealed && "opacity-0 invisible",
        )}
      />

      <video
        ref={videoRef}
        src={videoUrl}
        playsInline
        preload="none" // Essential for LCP metric padding: prevents video meta parsing from blocking main thread
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          togglePlay();
        }}
        onPlay={() => {
          setPlaying(true);
          setEnded(false);
          resetHideTimer();
        }}
        onPause={() => {
          setPlaying(false);
          setShowControls(true);
        }}
        onEnded={() => {
          setEnded(true);
          setPlaying(false);
          setShowControls(true);
        }}
        onTimeUpdate={() => {
          if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
        }}
        onLoadedMetadata={() => {
          if (videoRef.current) setDuration(videoRef.current.duration);
        }}
        className={cn(
          "absolute inset-0 w-full h-full object-contain z-10 transition-opacity duration-300",
          !revealed && "invisible",
        )}
      />

      {/* Spoiler overlay */}
      <div
        className={cn(
          "absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md cursor-pointer transition-all duration-300 group",
          revealed && "opacity-0 pointer-events-none",
        )}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setRevealed(true);
        }}
      >
        <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center mb-3 transition-all duration-200 group-hover:bg-white/20 group-hover:scale-110">
          <Eye className="h-6 w-6 text-white transition-transform duration-200 group-hover:scale-110" />
        </div>
        <span className="text-white font-semibold text-sm">
          {t("post.reveal_spoiler")}
        </span>
      </div>

      {/* Big play button (shown when paused, revealed, and not ended) */}
      {revealed && !playing && !ended && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            togglePlay();
          }}
          className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"
        >
          <div className="h-16 w-16 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-all hover:scale-110 active:scale-95">
            <Play className="h-7 w-7 text-white ml-1" fill="white" />
          </div>
        </button>
      )}

      {/* Big replay button (shown when ended) */}
      {revealed && ended && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            togglePlay();
          }}
          className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"
        >
          <div className="h-16 w-16 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-all hover:scale-110 active:scale-95">
            <RotateCcw className="h-7 w-7 text-white" />
          </div>
        </button>
      )}

      {/* Controls bar */}
      {revealed && (
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 z-20 px-3 pt-6 pb-3",
            "bg-gradient-to-t from-black/90 to-transparent",
            "transition-opacity duration-300",
            showControls ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
        >
          <div className="flex items-center gap-2 pr-10">
            {/* Play / Pause / Replay */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                togglePlay();
              }}
              className="text-white hover:text-white/80 transition-colors cursor-pointer p-1 flex-shrink-0"
            >
              {ended ? (
                <RotateCcw className="h-5 w-5" />
              ) : playing ? (
                <Pause className="h-5 w-5" fill="white" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" fill="white" />
              )}
            </button>

            {/* Progress bar */}
            <div
              className="relative flex-1 h-1 bg-white/30 rounded-full cursor-pointer group/bar"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!videoRef.current) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / rect.width;
                videoRef.current.currentTime = ratio * duration;
              }}
            >
              {/* Expanded hit area */}
              <div className="absolute -inset-y-2 inset-x-0" />
              <div
                className="absolute left-0 top-0 h-full bg-brand rounded-full"
                style={{ width: `${progress}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white shadow-md -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity"
                style={{ left: `${progress}%` }}
              />
            </div>

            {/* Time */}
            <span className="text-white text-xs font-medium tabular-nums flex-shrink-0">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Fullscreen */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!document.fullscreenElement) {
                  containerRef.current?.requestFullscreen();
                } else {
                  document.exitFullscreen();
                }
              }}
              className="text-white hover:text-white/80 transition-colors cursor-pointer p-1 flex-shrink-0"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Volume */}
      {revealed && (
        <div
          ref={volumeRef}
          className="absolute bottom-4 right-4 z-30 flex items-center justify-center"
          onMouseEnter={() => {
            if (volumeHideTimer.current) clearTimeout(volumeHideTimer.current);
            setShowVolume(true);
          }}
          onMouseLeave={() => {
            volumeHideTimer.current = setTimeout(
              () => setShowVolume(false),
              300,
            );
          }}
        >
          {showVolume && (
            <div className="absolute bottom-full mb-2 flex flex-col items-center px-3 py-2">
              <div
                className="relative w-1 h-20 bg-white/30 rounded-full cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  handleVolumeChange(e.clientY, rect);
                }}
                onMouseMove={(e) => {
                  if (e.buttons !== 1) return;
                  e.preventDefault();
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  handleVolumeChange(e.clientY, rect);
                }}
              >
                <div
                  className="absolute bottom-0 left-0 w-full bg-white rounded-full"
                  style={{ height: `${displayVolume * 100}%` }}
                />
                <div
                  className="absolute left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-white shadow-md"
                  style={{ bottom: `calc(${displayVolume * 100}% - 6px)` }}
                />
              </div>
            </div>
          )}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleMute();
            }}
            className="text-white hover:text-white/80 transition-colors cursor-pointer p-1"
          >
            <VolumeIcon className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export function VideoPost({
  post,
  layout,
  hasPinnedPostInFeed,
  onHideDelete,
  currentTab,
  isSingleView,
  isPriority = false,
}: VideoPostProps) {
  const { t } = useTranslation();

  if (layout === "compact") {
    return (
      <div className="flex items-stretch gap-3 px-4 py-3 hover:bg-foreground/5 cursor-pointer border-b border-surface-border transition-colors">
        <VideoPlayer
          videoUrl={post.videoUrl}
          thumbnailUrl={post.thumbnailUrl}
          duration={post.duration}
          spoiler={post.spoiler}
          isPriority={isPriority}
          compact
        />
        <div className="flex-1 min-w-0">
          <PostHeader
            post={post}
            layout="compact"
            hasPinnedPostInFeed={hasPinnedPostInFeed}
            onHideDelete={onHideDelete}
            currentTab={currentTab}
          />
          <h3 className="font-semibold text-sm leading-snug line-clamp-2 mt-0.5 mb-1 text-foreground">
            {post.title}
            {post.spoiler && (
              <span className="ml-1.5 text-[10px] font-bold uppercase text-foreground-40 tracking-wider">
                {t("post.spoiler")}
              </span>
            )}
          </h3>
          <PostActions {...post} layout="compact" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-surface-border bg-surface overflow-hidden">
      <PostHeader
        post={post}
        layout="card"
        hasPinnedPostInFeed={hasPinnedPostInFeed}
        onHideDelete={onHideDelete}
        currentTab={currentTab}
      />

      <div className="px-4 pb-2">
        <h2 className="font-heading font-bold text-xl leading-snug line-clamp-2">
          {post.title}
        </h2>
      </div>

      <VideoPlayer
        videoUrl={post.videoUrl}
        thumbnailUrl={post.thumbnailUrl}
        duration={post.duration}
        spoiler={post.spoiler}
        isPriority={isPriority}
      />

      {post.body && isSingleView && (
        <div className="px-4 py-3 border-t border-surface-border/30">
          <MarkdownRenderer content={post.body} />
        </div>
      )}

      <PostActions {...post} layout="card" />
    </div>
  );
}
