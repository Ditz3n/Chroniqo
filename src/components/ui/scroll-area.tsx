// src/components/ui/scroll-area.tsx
"use client";

import { useTouchDevice } from "@/lib/hooks/use-touch-device";
import { cn } from "@/lib/utils";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import * as React from "react";

type ScrollAreaProps = React.ComponentPropsWithoutRef<
  typeof ScrollAreaPrimitive.Root
> & {
  viewportClassName?: string;
  flexContent?: boolean;
  maxHeight?: string;
  horizontalScrollbarTop?: boolean;
  thumbSizeClass?: string;
};

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  ScrollAreaProps
>(
  (
    {
      className,
      children,
      viewportClassName,
      flexContent,
      maxHeight,
      horizontalScrollbarTop = false,
      thumbSizeClass,
      ...props
    },
    ref,
  ) => {
    const rootRef = React.useRef<HTMLDivElement>(null);
    const [height, setHeight] = React.useState(0);

    React.useEffect(() => {
      if (maxHeight) return; // skip observer when maxHeight is provided
      const el = rootRef.current;
      if (!el) return;
      const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
      ro.observe(el);
      return () => ro.disconnect();
    }, [maxHeight]);

    return (
      <ScrollAreaPrimitive.Root
        ref={(node) => {
          rootRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        className={cn("group/scrollarea relative overflow-hidden", className)}
        {...props}
      >
        {/* Horizontal scrollbar at the top if requested */}
        {horizontalScrollbarTop && (
          <ScrollBar
            orientation="horizontal"
            className="top-0 left-0 right-0 bottom-auto"
            thumbSizeClass={thumbSizeClass}
          />
        )}
        <ScrollAreaPrimitive.Viewport
          className={cn(
            "w-full rounded-[inherit]",
            flexContent
              ? "[&>div]:!flex [&>div]:!flex-col [&>div]:!h-full [&>div]:!min-w-0"
              : "[&>div]:!block [&>div]:!min-w-0",
            viewportClassName,
          )}
          style={maxHeight ? { maxHeight } : { height }}
        >
          {children}
        </ScrollAreaPrimitive.Viewport>
        <ScrollBar orientation="vertical" thumbSizeClass={thumbSizeClass} />
        {/* Horizontal scrollbar at the bottom if not top */}
        {!horizontalScrollbarTop && (
          <ScrollBar orientation="horizontal" thumbSizeClass={thumbSizeClass} />
        )}
        <ScrollAreaPrimitive.Corner />
      </ScrollAreaPrimitive.Root>
    );
  },
);
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

interface ScrollBarProps extends React.ComponentPropsWithoutRef<
  typeof ScrollAreaPrimitive.ScrollAreaScrollbar
> {
  thumbSizeClass?: string;
}

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  ScrollBarProps
>(({ className, orientation = "vertical", thumbSizeClass, ...props }, ref) => {
  const isTouch = useTouchDevice();
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      ref={ref}
      orientation={orientation}
      forceMount
      className={cn(
        "absolute z-20 flex touch-none select-none p-1",
        isTouch
          ? "opacity-100"
          : "opacity-0 transition-opacity duration-200 group-hover/scrollarea:opacity-100 group-focus-within/scrollarea:opacity-100 hover:opacity-100",
        orientation === "vertical" && "right-0 top-0 h-full w-3.5",
        orientation === "horizontal" && "bottom-0 left-0 h-3.5 w-full flex-col",
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        className={cn(
          "relative flex-1 rounded-full",
          "bg-foreground/18 hover:bg-foreground/28",
          thumbSizeClass && orientation === "horizontal" && thumbSizeClass,
        )}
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
});
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
