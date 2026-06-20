// src/components/ui/tooltip.tsx
"use client";

import { TooltipExtraProps, TooltipProps } from "@/types/app-types";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

// Raw primitives - exported for advanced use cases requiring full control
export const TooltipProvider = TooltipPrimitive.Provider;
export const TooltipRoot = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export const TooltipContent = TooltipPrimitive.Content;
export const TooltipArrow = TooltipPrimitive.Arrow;
export const TooltipPortal = TooltipPrimitive.Portal;

export function Tooltip({
  children,
  content,
  side = "top",
  delayDuration = 300,
  className,
  sideOffset = 6,
}: TooltipProps & TooltipExtraProps) {
  // Render children unwrapped when there is no tooltip content
  if (!content) return <>{children}</>;

  return (
    <TooltipPrimitive.Root delayDuration={delayDuration}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={sideOffset}
          className={
            className ||
            "z-[9999] max-w-xs rounded-xl bg-foreground px-3 py-1.5 text-xs font-medium text-background shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
          }
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-foreground" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
