// src/components/ui/dialog.tsx
"use client";

import { cn } from "@/lib/utils";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={`fixed inset-0 z-100 bg-black/40 backdrop-blur-sm data-[state=open]:animate-dialog-overlay-in data-[state=closed]:animate-dialog-overlay-out ${className ?? ""}`}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <DialogPrimitive.Content
          style={{
            width: "calc(100vw - 2rem)",
            maxWidth: "480px",
            maxHeight: "90dvh",
            display: "flex",
            flexDirection: "column",
            pointerEvents: "auto",
          }}
          className={`rounded-2xl bg-background text-foreground border border-surface-border shadow-xl data-[state=open]:animate-dialog-in data-[state=closed]:animate-dialog-out ${className ?? ""}`}
          {...props}
        >
          {children}
        </DialogPrimitive.Content>
      </div>
    </DialogPrimitive.Portal>
  );
}

function DialogHeader({
  children,
  className,
  onClose,
}: {
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
}) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3 border-b border-surface-border flex-shrink-0 ${className ?? ""}`}
    >
      {children}
      {onClose ? (
        <button
          onClick={onClose}
          className="rounded-lg p-1 hover:bg-foreground/10 transition-colors cursor-pointer ml-2 shrink-0"
        >
          <X size={18} />
        </button>
      ) : (
        <DialogPrimitive.Close className="rounded-lg p-1 hover:bg-foreground/10 transition-colors cursor-pointer ml-2 shrink-0">
          <X size={18} />
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogBody({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        overflowY: "auto",
        flex: 1,
        ...style,
      }}
      className={cn("p-4", className)}
    >
      {children}
    </div>
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={`text-base font-semibold text-foreground ${className ?? ""}`}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
};
