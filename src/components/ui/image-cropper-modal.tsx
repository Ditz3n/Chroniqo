// src/components/ui/image-cropper-modal.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { ImageCropperModalProps, Point } from "@/types/app-types";
import { ZoomIn, ZoomOut } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

export function ImageCropperModal({
  isOpen,
  onClose,
  imageSrc,
  shape,
  aspectRatio,
  onCropComplete,
  title,
}: ImageCropperModalProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });
  const [naturalScale, setNaturalScale] = useState(1);

  // Reset state when opening a new image
  const [prevKey, setPrevKey] = useState({ isOpen, imageSrc });
  if (prevKey.isOpen !== isOpen || prevKey.imageSrc !== imageSrc) {
    setPrevKey({ isOpen, imageSrc });
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [position],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !imageRef.current || !containerRef.current) return;
      const img = imageRef.current;
      const { width: cropWidth, height: cropHeight } =
        containerRef.current.getBoundingClientRect();
      const renderedW = img.naturalWidth * naturalScale * scale;
      const renderedH = img.naturalHeight * naturalScale * scale;
      const maxX = Math.max(0, (renderedW - cropWidth) / 2);
      const maxY = Math.max(0, (renderedH - cropHeight) / 2);

      setPosition({
        x: Math.min(maxX, Math.max(-maxX, e.clientX - dragStart.x)),
        y: Math.min(maxY, Math.max(-maxY, e.clientY - dragStart.y)),
      });
    },
    [isDragging, dragStart, naturalScale, scale],
  );

  const handlePointerUp = useCallback(() => setIsDragging(false), []);

  const handleImageLoad = useCallback(() => {
    requestAnimationFrame(() => {
      if (!containerRef.current || !imageRef.current) return;
      const img = imageRef.current;
      const { width, height } = containerRef.current.getBoundingClientRect();
      setNaturalScale(
        Math.max(width / img.naturalWidth, height / img.naturalHeight),
      );
    });
  }, []);

  useEffect(() => {
    if (!imageRef.current || !containerRef.current) return;
    const img = imageRef.current;
    const { width: cropWidth, height: cropHeight } =
      containerRef.current.getBoundingClientRect();
    const renderedW = img.naturalWidth * naturalScale * scale;
    const renderedH = img.naturalHeight * naturalScale * scale;
    const maxX = Math.max(0, (renderedW - cropWidth) / 2);
    const maxY = Math.max(0, (renderedH - cropHeight) / 2);
    setPosition((pos) => ({
      x: Math.min(maxX, Math.max(-maxX, pos.x)),
      y: Math.min(maxY, Math.max(-maxY, pos.y)),
    }));
  }, [scale, naturalScale]);

  const handleSave = async () => {
    if (!imageRef.current || !containerRef.current) return;
    const image = imageRef.current;
    const container = containerRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const OUTPUT_SIZE = 512;
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE / aspectRatio;

    const containerRect = container.getBoundingClientRect();
    const cropWidth = containerRect.width;
    const cropHeight = containerRect.height;
    const S = naturalScale * scale;
    const sourceX = image.naturalWidth / 2 - (cropWidth / 2 + position.x) / S;
    const sourceY = image.naturalHeight / 2 - (cropHeight / 2 + position.y) / S;
    const sourceWidth = cropWidth / S;
    const sourceHeight = cropHeight / S;

    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCropComplete(blob);
          onClose();
        }
      },
      "image/jpeg",
      0.9,
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0 bg-background border-surface-border [&>button]:hidden">
        <DialogHeader
          className="bg-surface py-4 px-6 border-b border-surface-border pr-4 shrink-0"
          onClose={onClose}
        >
          <DialogTitle className="font-bold text-foreground">
            {title || t("communityPage.crop_image")}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="pt-6 px-6 pb-0 flex flex-col items-center gap-6 min-h-0 overflow-y-auto">
          <div
            ref={containerRef}
            className={cn(
              "relative w-full overflow-hidden bg-foreground/5 cursor-grab active:cursor-grabbing border border-surface-border rounded-xl",
              shape === "round"
                ? "max-w-[320px] rounded-full"
                : "max-w-[500px] rounded-none",
            )}
            style={{ aspectRatio }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Upload preview"
              draggable={false}
              className="absolute top-1/2 left-1/2 max-w-none pointer-events-none"
              onLoad={handleImageLoad}
              style={{
                transformOrigin: "center center",
                transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${naturalScale * scale})`,
              }}
            />
            <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
              <div
                className={cn(
                  "w-full h-full shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] border-2 border-white/50",
                  shape === "round" ? "rounded-full" : "rounded-none",
                )}
                style={{
                  width: "100%",
                  height: shape === "round" ? "auto" : "100%",
                  aspectRatio,
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 w-full">
            <ZoomOut className="h-5 w-5 text-foreground-60" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-surface-border rounded-lg appearance-none cursor-pointer accent-brand"
            />
            <ZoomIn className="h-5 w-5 text-foreground-60" />
          </div>
        </DialogBody>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-border bg-surface shrink-0 mt-6">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-foreground-60 hover:text-foreground hover:bg-transparent cursor-pointer"
          >
            {t("MessagesPage.cancel")}
          </Button>
          <Button onClick={handleSave} className="cursor-pointer">
            {t("MessagesPage.save_nickname")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
