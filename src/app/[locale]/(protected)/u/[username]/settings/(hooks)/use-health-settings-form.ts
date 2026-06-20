import { useNumericRangeError } from "@/lib/hooks/use-numeric-range-error";
import { getDateYearsAgo, toISODateString } from "@/lib/utils/date";
import { TranslationFn, UserProfile } from "@/types/app-types";
import { useState } from "react";

export function useHealthSettingsForm({
  profile,
  onUpdate,
  t,
}: {
  profile: UserProfile;
  onUpdate: () => void;
  t: TranslationFn;
}) {
  const [gender, setGender] = useState<string | null>(profile.gender ?? null);
  const [age, setAge] = useState<number | null | undefined>(profile.age);
  const [birthDate, setBirthDate] = useState(
    profile.birthDate ? toISODateString(new Date(profile.birthDate)) : "",
  );
  const [autoUpdateAge, setAutoUpdateAge] = useState(
    profile.autoUpdateAge ?? false,
  );
  const [height, setHeight] = useState<number | null | undefined>(
    profile.height,
  );
  const [heightUnit, setHeightUnit] = useState(profile.heightUnit ?? "cm");
  const [weight, setWeight] = useState<number | null | undefined>(
    profile.weight,
  );
  const [weightUnit, setWeightUnit] = useState(profile.weightUnit ?? "kg");
  const [conditions, setConditions] = useState<string[]>(
    profile.conditions ?? [],
  );
  const [medications, setMedications] = useState<string[]>(
    profile.medications ?? [],
  );
  const [showAge, setShowAge] = useState(profile.showAge ?? true);
  const [showConditions, setShowConditions] = useState(
    profile.showConditions ?? true,
  );
  const [showMedications, setShowMedications] = useState(
    profile.showMedications ?? false,
  );
  const [showHeight, setShowHeight] = useState(profile.showHeight ?? false);
  const [showWeight, setShowWeight] = useState(profile.showWeight ?? false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const heightMin = heightUnit === "cm" ? 100 : 4;
  const heightMax = heightUnit === "cm" ? 230 : 8;
  const weightMin = weightUnit === "kg" ? 30 : 60;
  const weightMax = weightUnit === "kg" ? 200 : 400;

  const ageError = useNumericRangeError({
    value: age,
    min: 13,
    max: 99,
    t,
  });
  const heightError = useNumericRangeError({
    value: height,
    min: heightMin,
    max: heightMax,
    t,
  });
  const weightError = useNumericRangeError({
    value: weight,
    min: weightMin,
    max: weightMax,
    t,
  });

  const hasValidationErrors = !!(ageError || heightError || weightError);
  const minBirthDateStr = toISODateString(getDateYearsAgo(13));

  const genderLabels: Record<string, string> = {
    Male: t("settings.gender_male"),
    Female: t("settings.gender_female"),
  };

  const handleHeightUnitChange = (u: string) => {
    setHeightUnit(u);
    setHeight(null);
  };

  const handleWeightUnitChange = (u: string) => {
    setWeightUnit(u);
    setWeight(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        showAge,
        showConditions,
        showMedications,
        showHeight,
        showWeight,
        conditions,
        medications,
        autoUpdateAge,
        gender,
      };

      if (age != null) body.age = age;
      if (height !== undefined) {
        body.height = height ?? null;
        body.heightUnit = heightUnit;
      }
      if (weight !== undefined) {
        body.weight = weight ?? null;
        body.weightUnit = weightUnit;
      }
      if (birthDate !== "") {
        body.birthDate = birthDate;
      } else if (profile.birthDate) {
        body.birthDate = null;
      }

      const res = await fetch("/api/users/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? t("settings.save_error"));
        return;
      }

      onUpdate();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch {
      setError(t("settings.save_error"));
    } finally {
      setIsSaving(false);
    }
  };

  return {
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
  };
}
