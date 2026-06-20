// src/components/ui/image-or-icon-dialog.tsx
import { Palette, Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "./dialog";

interface ImageOrIconDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  onImageSelect: (file: File) => void;
  onIconPick: () => void;
  onRemove?: () => void;
  showRemove?: boolean;
  removeLabel: string;
  uploadLabel: string;
  pickIconLabel: string;
}

export function ImageOrIconDialog({
  open,
  onClose,
  title,
  onImageSelect,
  onIconPick,
  onRemove,
  showRemove = false,
  removeLabel,
  uploadLabel,
  pickIconLabel,
}: ImageOrIconDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-6 border-surface-border bg-background">
        <div className="flex items-center justify-between mb-6">
          <DialogTitle className="text-lg font-bold text-foreground">
            {title}
          </DialogTitle>
          <button
            onClick={onClose}
            className="text-foreground-40 hover:text-foreground cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-surface-border rounded-2xl bg-surface hover:bg-foreground/5 transition-colors cursor-pointer group">
            <Upload className="h-6 w-6 text-foreground-40 group-hover:text-brand transition-colors mb-2" />
            <span className="text-sm font-semibold text-foreground-60 group-hover:text-foreground transition-colors">
              {uploadLabel}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImageSelect(file);
                e.target.value = "";
              }}
            />
          </label>
          <button
            onClick={onIconPick}
            className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-surface-border rounded-2xl bg-surface hover:bg-foreground/5 transition-colors cursor-pointer group"
          >
            <Palette className="h-6 w-6 text-foreground-40 group-hover:text-brand transition-colors mb-2" />
            <span className="text-sm font-semibold text-foreground-60 group-hover:text-foreground transition-colors">
              {pickIconLabel}
            </span>
          </button>
          {showRemove && (
            <button
              onClick={onRemove}
              className="text-sm font-semibold text-brand hover:underline p-2 cursor-pointer"
            >
              {removeLabel}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
