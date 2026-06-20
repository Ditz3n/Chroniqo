// src/app/[locale]/(protected)/u/[username]/settings/(components)/numeric-field.tsx
"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export function NumericField({
  id,
  label,
  value,
  onChange,
  onClear,
  min,
  max,
  step = 1,
  unit,
  unitOptions,
  onUnitChange,
  canClear = false,
  disabled = false,
  error,
}: {
  id: string;
  label: string;
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  onClear?: () => void;
  min: number;
  max: number;
  step?: number;
  unit?: string | null;
  unitOptions?: string[];
  onUnitChange?: (u: string) => void;
  canClear?: boolean;
  disabled?: boolean;
  error?: string | null;
}) {
  const { t } = useTranslation();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-1.5">
        <label htmlFor={id} className="text-sm font-semibold text-foreground">
          {label}
        </label>
        <span className="text-xs text-foreground-40 font-normal">
          ({min} - {max}
          {unit ? ` ${unit}` : ""})
        </span>
      </div>

      <div className="flex gap-2">
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value ?? ""}
          disabled={disabled}
          onKeyDown={handleKeyDown}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(raw === "" ? null : Number(raw));
          }}
          className={cn(
            "flex-1 px-4 py-3 bg-background border rounded-xl text-sm text-foreground",
            "focus:outline-none focus:ring-2 focus:ring-brand/30 transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "[appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden",
            error
              ? "border-feedback-error focus:border-feedback-error"
              : "border-surface-border focus:border-brand",
          )}
        />

        {unitOptions && unit && onUnitChange && (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                className="flex items-center gap-1.5 px-3 py-3 bg-background border border-surface-border rounded-xl text-sm font-medium hover:bg-foreground/5 transition-colors min-w-[68px] justify-between cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {unit}
                <ChevronDown className="h-3.5 w-3.5 text-foreground-40" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-background rounded-xl min-w-[80px] p-0 overflow-hidden"
            >
              {unitOptions.map((u) => (
                <DropdownMenuItem
                  key={u}
                  onClick={() => onUnitChange(u)}
                  className={cn(
                    "px-4 py-2.5 cursor-pointer text-sm rounded-none",
                    unit === u && "bg-foreground/5 font-bold",
                  )}
                >
                  {u}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {canClear && value != null && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="px-3 py-2 text-xs font-semibold text-foreground-60 border border-surface-border rounded-xl hover:bg-foreground/5 transition-colors cursor-pointer"
          >
            {t("settings.clear")}
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs font-medium text-feedback-error px-1">{error}</p>
      )}
    </div>
  );
}
