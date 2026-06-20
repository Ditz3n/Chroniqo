// src/app/[locale]/onboarding/(components)/steps/types.ts
import { OnboardDTO } from "@/lib/dtos/auth.dto";

export interface StepProps {
  data: Partial<OnboardDTO>;
  updateData: (updates: Partial<OnboardDTO>) => void;
  onValidationChange?: (
    status: "available" | "taken" | "checking" | "none",
  ) => void;
}
