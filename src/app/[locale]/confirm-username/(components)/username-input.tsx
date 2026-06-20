// src/app/[locale]/confirm-username/(components)/username-input.tsx
import { UsernameInputProps } from "@/types/app-types";
import { AlertCircle, Check } from "lucide-react";

export function UsernameInput({
  id,
  value,
  onChange,
  indicator,
}: UsernameInputProps) {
  const clean = (raw: string) =>
    raw
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "")
      .slice(0, 30);

  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-background border border-surface-border rounded-xl transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand">
      <span className="text-sm font-medium text-foreground-40 select-none shrink-0">
        u/
      </span>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(clean(e.target.value))}
        autoComplete="off"
        maxLength={30}
        className="flex-1 bg-transparent text-foreground text-sm focus:outline-none appearance-none min-w-0"
      />
      {indicator === "valid" && (
        <Check className="h-4 w-4 text-feedback-success flex-shrink-0" />
      )}
      {indicator === "invalid" && (
        <AlertCircle className="h-4 w-4 text-feedback-error flex-shrink-0" />
      )}
    </div>
  );
}
