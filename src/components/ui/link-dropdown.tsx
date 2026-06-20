// src/components/ui/link-dropdown.tsx
"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/lib/hooks/use-translation";
import { LinkDropdownProps } from "@/types/app-types";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";

export function LinkDropdown({
  url,
  isOpen,
  onOpenChange,
  onEdit,
  onDelete,
  children,
}: LinkDropdownProps) {
  const { t } = useTranslation();

  return (
    <DropdownMenu open={isOpen} onOpenChange={onOpenChange} modal={false}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-56 p-0 rounded-xl border-surface-border bg-background shadow-xl"
      >
        <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-foreground-40 border-b border-surface-border">
          {t("richText.link")}
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-3 text-sm hover:bg-foreground/5 cursor-pointer group border-b border-surface-border"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-4 w-4 text-foreground-60 transition-transform group-hover:scale-110 flex-shrink-0" />
          <span className="text-brand underline truncate font-medium">
            {url}
          </span>
        </a>
        <DropdownMenuItem
          className="cursor-pointer gap-2 rounded-none px-3 py-3 group hover:bg-foreground/5 text-foreground-60 font-medium"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Pencil className="h-4 w-4 transition-transform group-hover:scale-110" />
          <span className="group-hover:text-foreground transition-colors">
            {t("richText.edit_link")}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer gap-2 rounded-none px-3 py-3 group text-brand hover:bg-foreground/5 font-bold"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-4 w-4 transition-transform group-hover:scale-110 text-brand" />
          <span className="text-brand group-hover:text-brand">
            {t("richText.delete_link")}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
