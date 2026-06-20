// src/app/[locale]/(protected)/u/[username]/settings/(components)/visibility-row.tsx
"use client";

import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff } from "lucide-react";

export function VisibilityRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs font-medium text-foreground-60">
      {checked ? (
        <Eye className="h-3.5 w-3.5 flex-shrink-0" />
      ) : (
        <EyeOff className="h-3.5 w-3.5 flex-shrink-0" />
      )}
      <span>{label}</span>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="ml-auto scale-90"
      />
    </div>
  );
}
