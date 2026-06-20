// src/app/[locale]/(protected)/u/[username]/settings/(components)/health-settings.tsx
"use client";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { TagInput } from "@/components/ui/tag-input";
import {
  CONDITION_SUGGESTION_KEYS,
  MEDICATION_SUGGESTION_KEYS,
} from "@/lib/constants";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { UserProfile } from "@/types/app-types";
import { ChevronDown } from "lucide-react";
import { useHealthSettingsForm } from "../(hooks)/use-health-settings-form";
import { NumericField } from "./numeric-field";
import { VisibilityRow } from "./visibility-row";

export function HealthSettings({
  profile,
  onUpdate,
}: {
  profile: UserProfile;
  onUpdate: () => void;
}) {
  const { t } = useTranslation();
  const {
    gender,
    setGender,
    age,
    setAge,
    birthDate,
    setBirthDate,
    autoUpdateAge,
    setAutoUpdateAge,
    height,
    setHeight,
    heightUnit,
    weight,
    setWeight,
    weightUnit,
    conditions,
    setConditions,
    medications,
    setMedications,
    showAge,
    setShowAge,
    showConditions,
    setShowConditions,
    showMedications,
    setShowMedications,
    showHeight,
    setShowHeight,
    showWeight,
    setShowWeight,
    isSaving,
    showSuccess,
    error,
    heightMin,
    heightMax,
    weightMin,
    weightMax,
    ageError,
    heightError,
    weightError,
    hasValidationErrors,
    minBirthDateStr,
    genderLabels,
    handleHeightUnitChange,
    handleWeightUnitChange,
    handleSave,
  } = useHealthSettingsForm({ profile, onUpdate, t });

  const conditionSuggestions = CONDITION_SUGGESTION_KEYS.map((key) => t(key));
  const medicationSuggestions = MEDICATION_SUGGESTION_KEYS.map((key) => t(key));

  return (
    <div className="flex flex-col gap-8 bg-surface border border-surface-border rounded-2xl p-6">
      {/* Gender */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-foreground">
          {t("settings.gender_label")}
        </label>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center justify-between w-full px-4 py-3 bg-background border border-surface-border rounded-xl text-sm font-medium hover:bg-foreground/5 transition-colors cursor-pointer"
            >
              <span
                className={gender ? "text-foreground" : "text-foreground-40"}
              >
                {gender
                  ? genderLabels[gender]
                  : t("settings.gender_not_selected")}
              </span>
              <ChevronDown className="h-4 w-4 text-foreground-40" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-background rounded-xl w-[--radix-dropdown-menu-trigger-width] p-0 overflow-hidden">
            <DropdownMenuItem
              onClick={() => setGender(null)}
              className={cn(
                "px-4 py-2.5 cursor-pointer text-sm rounded-none",
                gender === null && "bg-foreground/5 font-bold",
              )}
            >
              {t("settings.gender_not_selected")}
            </DropdownMenuItem>
            {["Male", "Female"].map((g) => (
              <DropdownMenuItem
                key={g}
                onClick={() => setGender(g)}
                className={cn(
                  "px-4 py-2.5 cursor-pointer text-sm rounded-none",
                  gender === g && "bg-foreground/5 font-bold",
                )}
              >
                {genderLabels[g]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="h-px w-full bg-surface-border" />

      {/* Age */}
      <div className="flex flex-col gap-3">
        <NumericField
          id="age"
          label={t("settings.age_label")}
          value={age}
          onChange={setAge}
          min={13}
          max={99}
          error={ageError}
        />
        <VisibilityRow
          checked={showAge}
          onChange={setShowAge}
          label={t("settings.show_age")}
        />
      </div>

      <div className="h-px w-full bg-surface-border" />

      {/* Birth Date */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-foreground">
            {t("settings.birth_date_label")}
          </label>
          <DatePicker
            value={birthDate}
            onChange={(v) => {
              setBirthDate(v);
              if (!v) setAutoUpdateAge(false);
            }}
            max={minBirthDateStr}
            defaultViewDate={minBirthDateStr}
            placeholder={t("settings.birth_date_label")}
            clearLabel={t("settings.clear")}
          />
          <p className="text-xs text-foreground-40">
            {t("settings.birth_date_hint")}
          </p>
        </div>

        {birthDate && (
          <div className="flex items-center justify-between gap-4 px-4 py-3 bg-background border border-surface-border rounded-xl">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">
                {t("settings.auto_update_age")}
              </span>
              <span className="text-xs text-foreground-60">
                {t("settings.auto_update_age_desc")}
              </span>
            </div>
            <Switch
              checked={autoUpdateAge}
              onCheckedChange={setAutoUpdateAge}
            />
          </div>
        )}
      </div>

      <div className="h-px w-full bg-surface-border" />

      {/* Height */}
      <div className="flex flex-col gap-3">
        <NumericField
          id="height"
          label={t("settings.height_label")}
          value={height}
          onChange={setHeight}
          onClear={() => setHeight(null)}
          min={heightMin}
          max={heightMax}
          step={heightUnit === "cm" ? 1 : 0.1}
          unit={heightUnit}
          unitOptions={["cm", "ft"]}
          onUnitChange={handleHeightUnitChange}
          canClear
          error={heightError}
        />
        <VisibilityRow
          checked={showHeight}
          onChange={setShowHeight}
          label={t("settings.show_height")}
        />
      </div>

      <div className="h-px w-full bg-surface-border" />

      {/* Weight */}
      <div className="flex flex-col gap-3">
        <NumericField
          id="weight"
          label={t("settings.weight_label")}
          value={weight}
          onChange={setWeight}
          onClear={() => setWeight(null)}
          min={weightMin}
          max={weightMax}
          step={0.1}
          unit={weightUnit}
          unitOptions={["kg", "lbs"]}
          onUnitChange={handleWeightUnitChange}
          canClear
          error={weightError}
        />
        <VisibilityRow
          checked={showWeight}
          onChange={setShowWeight}
          label={t("settings.show_weight")}
        />
      </div>

      <div className="h-px w-full bg-surface-border" />

      {/* Conditions */}
      <div className="flex flex-col gap-3">
        <label className="text-sm font-semibold text-foreground">
          {t("settings.conditions_label")}
        </label>
        <TagInput
          tags={conditions}
          onChange={setConditions}
          placeholder={t("settings.conditions_placeholder")}
          suggestions={conditionSuggestions}
        />
        <VisibilityRow
          checked={showConditions}
          onChange={setShowConditions}
          label={t("settings.show_conditions")}
        />
      </div>

      <div className="h-px w-full bg-surface-border" />

      {/* Medications */}
      <div className="flex flex-col gap-3">
        <label className="text-sm font-semibold text-foreground">
          {t("settings.medications_label")}
        </label>
        <TagInput
          tags={medications}
          onChange={setMedications}
          placeholder={t("settings.medications_placeholder")}
          suggestions={medicationSuggestions}
        />
        <VisibilityRow
          checked={showMedications}
          onChange={setShowMedications}
          label={t("settings.show_medications")}
        />
      </div>

      {/* Save Footer */}
      <div className="mt-2 flex items-center justify-end gap-4">
        {error && (
          <span className="text-sm font-medium text-feedback-error">
            {error}
          </span>
        )}
        {showSuccess && (
          <span className="text-sm font-bold text-brand animate-in fade-in">
            {t("settings.success")}
          </span>
        )}
        <Button
          disabled={isSaving || hasValidationErrors}
          onClick={handleSave}
          className="cursor-pointer"
        >
          {isSaving ? t("settings.saving") : t("settings.save")}
        </Button>
      </div>
    </div>
  );
}
