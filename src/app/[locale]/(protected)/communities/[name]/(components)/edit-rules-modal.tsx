// src/app/[locale]/(protected)/communities/[name]/(components)/edit-rules-modal.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "@/lib/hooks/use-translation";
import { Plus, Trash2 } from "lucide-react";

interface EditRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: string[];
  setRules: (rules: string[]) => void;
}

export function EditRulesModal({
  isOpen,
  onClose,
  rules,
  setRules,
}: EditRulesModalProps) {
  const { t } = useTranslation();
  const MAX_RULES = 10;
  const MAX_CHARS = 200;

  const addRule = () => {
    if (rules.length < MAX_RULES) {
      setRules([...rules, ""]);
    }
  };

  const updateRule = (index: number, val: string) => {
    if (val.length > MAX_CHARS) return;
    const newRules = [...rules];
    newRules[index] = val;
    setRules(newRules);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        className="sm:max-w-lg p-0 overflow-hidden gap-0 bg-background border-surface-border flex flex-col h-[90dvh] max-h-[90dvh] min-h-0"
      >
        <DialogHeader
          className="bg-surface py-4 px-6 border-b border-surface-border shrink-0"
          onClose={onClose}
        >
          <DialogTitle className="font-bold text-foreground">
            {t("communityPage.edit_rules")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden">
          <ScrollArea className="flex-1 min-h-0">
            <div className="pt-12 px-6 pb-6 flex flex-col gap-8">
              {rules.map((rule, idx) => (
                <div key={idx} className="flex flex-col">
                  <div className="flex items-center gap-3">
                    <span className="text-foreground-40 font-bold w-4 text-right shrink-0">
                      {idx + 1}.
                    </span>

                    <div className="flex-1 relative rounded-xl bg-background">
                      <textarea
                        rows={2}
                        value={rule}
                        onChange={(e) => updateRule(idx, e.target.value)}
                        placeholder=" "
                        maxLength={MAX_CHARS}
                        className="notched-input peer w-full px-4 pt-5 pb-3 rounded-xl bg-transparent text-sm text-foreground focus:outline-none resize-none relative z-[1]"
                      />
                      <label className="floating-label">
                        {t("communityPage.rule_placeholder")}
                      </label>
                      <fieldset className="notched-outline" aria-hidden="true">
                        <legend>{t("communityPage.rule_placeholder")}</legend>
                      </fieldset>
                    </div>

                    <Button
                      type="button"
                      variant="brand"
                      size="icon"
                      onClick={() => removeRule(idx)}
                      className="h-11 w-11 shrink-0"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="text-right text-[10px] text-foreground-40 font-medium mt-1 mr-14">
                    {rule.length} / {MAX_CHARS}
                  </div>
                </div>
              ))}

              {rules.length < MAX_RULES ? (
                <Button
                  type="button"
                  variant="outline-surface"
                  onClick={addRule}
                  className="mt-1 gap-2 ml-7 mr-7 cursor-pointer w-fit"
                >
                  <Plus className="h-4 w-4" />
                  {t("communityPage.add_rule")}
                </Button>
              ) : (
                <p className="text-xs font-bold uppercase tracking-wider text-foreground-40 mt-2">
                  {t("communityPage.rules_limit_reached")}
                </p>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-border bg-surface shrink-0">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-foreground-60 hover:text-foreground hover:bg-transparent"
            >
              {t("communityPage.cancel")}
            </Button>
            <Button variant="brand" onClick={onClose}>
              {t("communityPage.rules_done")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
