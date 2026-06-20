// src/components/ui/spoiler.tsx
"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

export function Spoiler({ children }: { children: React.ReactNode }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <span
      onClick={() => setRevealed(true)}
      className={cn(
        "inline-block rounded-[3px] px-[1px] transition-all duration-300 cursor-pointer select-none",
        revealed
          ? "text-foreground-60 bg-transparent"
          : "text-transparent bg-foreground/20 hover:bg-foreground/30",
      )}
    >
      {children}
    </span>
  );
}
