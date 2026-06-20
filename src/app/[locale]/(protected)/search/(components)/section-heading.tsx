// src/app/[locale]/(protected)/search/(components)/section-heading.tsx
import { SectionHeadingProps } from "@/types/app-types";

export function SectionHeading({ children }: SectionHeadingProps) {
  return (
    <h2 className="text-sm font-bold uppercase tracking-wider text-foreground-40 pl-1">
      {children}
    </h2>
  );
}
