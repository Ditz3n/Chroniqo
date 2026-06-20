// src/components/ui/table-context-menu.tsx
"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { TableContextMenuProps } from "@/types/app-types";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronLeft,
  ChevronRight,
  Columns,
  Plus,
  Rows,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type TableSubmenuView = "main" | "rows" | "columns" | "align";

export function TableContextMenu({
  isOpen,
  onOpenChange,
  onInsertRowAbove,
  onInsertRowBelow,
  onDeleteRow,
  onInsertColumnBefore,
  onInsertColumnAfter,
  onDeleteColumn,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onDeleteTable,
  triggerElement,
}: TableContextMenuProps & { onInsertRowAbove?: () => void }) {
  const { t } = useTranslation();
  const [menuView, setMenuView] = useState<TableSubmenuView>("main");
  const [rect, setRect] = useState<DOMRect | null>(null);

  const PANEL_WIDTH = 224;

  // Close menu on scroll, update position on resize
  useEffect(() => {
    if (!isOpen || !triggerElement) return;

    const updatePosition = () => {
      setRect(triggerElement.getBoundingClientRect());
    };

    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      // Do not close if scrolling inside the dropdown menu itself
      if (target.closest && target.closest('[role="menu"]')) return;
      onOpenChange(false);
    };

    updatePosition(); // Initial position

    // Use capture phase to catch scroll events on any internal scrollable container
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, triggerElement, onOpenChange]);

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      setTimeout(() => setMenuView("main"), 250); // Reset view when closed
    }
  };

  if (!triggerElement || !rect) return null;

  const trackOffset = menuView === "main" ? 0 : -PANEL_WIDTH;

  const menuItemCls =
    "py-3 px-4 cursor-pointer rounded-none w-full text-foreground-60 font-medium group/item hover:bg-foreground/5";

  return createPortal(
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange} modal={false}>
      <DropdownMenuTrigger asChild>
        <div
          style={{
            position: "fixed",
            top: rect.top + "px",
            left: rect.left + "px",
            width: rect.width + "px",
            height: rect.height + "px",
            pointerEvents: "none",
            zIndex: 9999,
          }}
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={5}
        collisionPadding={16}
        className="w-56 p-0 rounded-xl border-surface-border bg-background shadow-xl overflow-hidden"
        onCloseAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement;
          if (
            target.closest("[data-slate-editor]") ||
            target.closest("table")
          ) {
            e.preventDefault();
          }
        }}
      >
        <div
          className="flex transition-transform duration-300 ease-in-out"
          style={{
            width: `${PANEL_WIDTH * 2}px`,
            transform: `translateX(${trackOffset}px)`,
          }}
        >
          {/* Main View */}
          <div style={{ width: PANEL_WIDTH }} className="flex-shrink-0">
            <div className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-foreground-40 border-b border-surface-border">
              {t("richText.table_actions")}
            </div>

            <DropdownMenuItem
              className={cn(menuItemCls, "justify-between")}
              onSelect={(e) => {
                e.preventDefault();
                setMenuView("rows");
              }}
            >
              <div className="flex items-center">
                <Rows className="h-4 w-4 mr-2.5 transition-transform duration-200 group-hover/item:scale-110" />
                {t("richText.table_rows")}
              </div>
              <ChevronRight className="h-4 w-4 text-foreground-40" />
            </DropdownMenuItem>

            <DropdownMenuItem
              className={cn(menuItemCls, "justify-between")}
              onSelect={(e) => {
                e.preventDefault();
                setMenuView("columns");
              }}
            >
              <div className="flex items-center">
                <Columns className="h-4 w-4 mr-2.5 transition-transform duration-200 group-hover/item:scale-110" />
                {t("richText.table_columns")}
              </div>
              <ChevronRight className="h-4 w-4 text-foreground-40" />
            </DropdownMenuItem>

            <DropdownMenuItem
              className={cn(menuItemCls, "justify-between")}
              onSelect={(e) => {
                e.preventDefault();
                setMenuView("align");
              }}
            >
              <div className="flex items-center">
                <AlignLeft className="h-4 w-4 mr-2.5 transition-transform duration-200 group-hover/item:scale-110" />
                {t("richText.table_alignment")}
              </div>
              <ChevronRight className="h-4 w-4 text-foreground-40" />
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-surface-border m-0" />

            <DropdownMenuItem
              className="py-3 px-4 rounded-none w-full text-brand! font-medium group/item hover:bg-foreground/5 cursor-pointer"
              onSelect={(e) => {
                e.preventDefault();
                setTimeout(() => onDeleteTable(), 0);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2.5 text-brand transition-transform duration-200 group-hover/item:scale-110" />
              {t("richText.delete_table")}
            </DropdownMenuItem>
          </div>

          {/* Submenus View */}
          <div
            style={{ width: PANEL_WIDTH }}
            className="flex-shrink-0 relative"
          >
            <div className="flex items-center border-b border-surface-border">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuView("main");
                }}
                className="self-stretch pl-4 pr-3 flex items-center justify-center cursor-pointer flex-shrink-0 transition-transform duration-150 active:scale-95 text-foreground-60"
              >
                <ChevronLeft className="h-4 w-4 transition-transform duration-200 hover:scale-110" />
              </button>
              <span className="text-sm font-bold text-foreground-60 py-2.5">
                {t("richText.table_back")}
              </span>
            </div>

            {/* Rows Submenu */}
            <div
              className={cn(
                "absolute w-full top-[45px]",
                menuView === "rows" ? "block" : "hidden",
              )}
            >
              <DropdownMenuItem
                className={menuItemCls}
                onSelect={(e) => {
                  e.preventDefault();
                  setTimeout(() => onInsertRowAbove?.(), 0);
                }}
              >
                <Plus className="h-4 w-4 mr-2.5 transition-transform duration-200 group-hover/item:scale-110" />
                {t("richText.insert_row_above")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={menuItemCls}
                onSelect={(e) => {
                  e.preventDefault();
                  setTimeout(() => onInsertRowBelow(), 0);
                }}
              >
                <Plus className="h-4 w-4 mr-2.5 transition-transform duration-200 group-hover/item:scale-110" />
                {t("richText.insert_row_below")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={menuItemCls}
                onSelect={(e) => {
                  e.preventDefault();
                  setTimeout(() => onDeleteRow(), 0);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2.5 transition-transform duration-200 group-hover/item:scale-110" />
                {t("richText.delete_row")}
              </DropdownMenuItem>
            </div>

            {/* Columns Submenu */}
            <div
              className={cn(
                "absolute w-full top-[45px]",
                menuView === "columns" ? "block" : "hidden",
              )}
            >
              <DropdownMenuItem
                className={menuItemCls}
                onSelect={(e) => {
                  e.preventDefault();
                  setTimeout(() => onInsertColumnBefore(), 0);
                }}
              >
                <Plus className="h-4 w-4 mr-2.5 transition-transform duration-200 group-hover/item:scale-110" />
                {t("richText.insert_column_before")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={menuItemCls}
                onSelect={(e) => {
                  e.preventDefault();
                  setTimeout(() => onInsertColumnAfter(), 0);
                }}
              >
                <Plus className="h-4 w-4 mr-2.5 transition-transform duration-200 group-hover/item:scale-110" />
                {t("richText.insert_column_after")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={menuItemCls}
                onSelect={(e) => {
                  e.preventDefault();
                  setTimeout(() => onDeleteColumn(), 0);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2.5 transition-transform duration-200 group-hover/item:scale-110" />
                {t("richText.delete_column")}
              </DropdownMenuItem>
            </div>

            {/* Align Submenu */}
            <div
              className={cn(
                "absolute w-full top-[45px]",
                menuView === "align" ? "block" : "hidden",
              )}
            >
              <DropdownMenuItem
                className={menuItemCls}
                onSelect={(e) => {
                  e.preventDefault();
                  setTimeout(() => onAlignLeft(), 0);
                }}
              >
                <AlignLeft className="h-4 w-4 mr-2.5 transition-transform duration-200 group-hover/item:scale-110" />
                {t("richText.align_left")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={menuItemCls}
                onSelect={(e) => {
                  e.preventDefault();
                  setTimeout(() => onAlignCenter(), 0);
                }}
              >
                <AlignCenter className="h-4 w-4 mr-2.5 transition-transform duration-200 group-hover/item:scale-110" />
                {t("richText.align_center")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={menuItemCls}
                onSelect={(e) => {
                  e.preventDefault();
                  setTimeout(() => onAlignRight(), 0);
                }}
              >
                <AlignRight className="h-4 w-4 mr-2.5 transition-transform duration-200 group-hover/item:scale-110" />
                {t("richText.align_right")}
              </DropdownMenuItem>
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>,
    document.body,
  );
}
