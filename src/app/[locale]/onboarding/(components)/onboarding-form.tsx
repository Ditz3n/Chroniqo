// src/app/[locale]/onboarding/(components)/onboarding-form.tsx
"use client";

import { Button } from "@/components/ui/button";
import { OnboardDTO } from "@/lib/dtos/auth.dto";
import { useTranslation } from "@/lib/hooks/use-translation";
import { ChevronLeft } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { EmailVerificationGate } from "./email-verification-gate";
import { OnboardingWelcome } from "./onboarding-welcome";
import { StepAge, StepGender } from "./steps/demographics-steps";
import { StepIllnesses, StepMedications } from "./steps/health-steps";
import { StepHeight, StepWeight } from "./steps/metrics-steps";
import { StepMood, StepNote } from "./steps/mood-steps";
import { StepFirstName, StepLastName, StepUsername } from "./steps/name-steps";

const TOTAL_STEPS = 11;

interface OnboardingFormProps {
  requiresVerification: boolean;
  userEmail: string;
}

export function OnboardingForm({
  requiresVerification,
  userEmail,
}: OnboardingFormProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const { update } = useSession();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [moodTouched, setMoodTouched] = useState(false);
  const [ageTouched, setAgeTouched] = useState(false);
  const [weightTouched, setWeightTouched] = useState(false);
  const [heightTouched, setHeightTouched] = useState(false);
  const [usernameValidation, setUsernameValidation] = useState<
    "available" | "taken" | "checking" | "none"
  >("none");

  // Controls whether the email verification gate is shown vs. the actual form
  const [showWelcome, setShowWelcome] = useState(false);
  const [isVerified, setIsVerified] = useState(!requiresVerification);

  // Centralized state holding all onboard data
  const [formData, setFormData] = useState<Partial<OnboardDTO>>({
    gender: undefined,
    weightUnit: "kg",
    heightUnit: "cm",
    conditions: [],
    medications: [],
    moodValue: 2,
    moodNote: "",
  });

  useEffect(() => {
    const loadExistingData = async () => {
      try {
        const res = await fetch("/api/user/onboard");
        if (res.ok) {
          const data = await res.json();
          setFormData((prev) => ({
            ...prev,
            firstName: data.firstName || prev.firstName,
            lastName: data.lastName || prev.lastName,
            username: data.username || prev.username,
            gender: data.gender || prev.gender,
            age: data.age || prev.age,
            weight: data.weight || prev.weight,
            weightUnit: data.weightUnit || prev.weightUnit,
            height: data.height || prev.height,
            heightUnit: data.heightUnit || prev.heightUnit,
            medications: data.medications?.length
              ? data.medications
              : prev.medications,
            conditions: data.conditions?.length
              ? data.conditions
              : prev.conditions,
          }));
          if (data.onboardingStep) setStep(data.onboardingStep);
        }
      } catch {
        console.error("[OnboardingForm] Failed to load existing data");
      } finally {
        setIsInitializing(false);
      }
    };
    loadExistingData();
  }, []);

  const updateData = (updates: Partial<OnboardDTO>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const saveProgress = async (
    currentStep: number,
    updates?: Partial<OnboardDTO>,
  ) => {
    // Only persist the fields belonging to the step just completed (currentStep - 1)
    const stepFieldMap: Record<number, (keyof OnboardDTO)[]> = {
      2: ["firstName"],
      3: ["lastName"],
      4: ["username"],
      5: ["gender"],
      6: ["age"],
      7: ["weight", "weightUnit"],
      8: ["height", "heightUnit"],
      9: ["conditions"],
      10: ["medications"],
      11: ["moodValue"],
    };

    const relevantFields = stepFieldMap[currentStep] ?? [];
    const stepData = Object.fromEntries(
      relevantFields.map((k) => [k, (updates ?? formData)[k] ?? formData[k]]),
    );

    // Prevent saving mood logic via backend to avoid logging the status to the wrong day
    if ("moodValue" in stepData) delete stepData.moodValue;
    if ("moodNote" in stepData) delete stepData.moodNote;

    const res = await fetch("/api/user/onboard", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...stepData, onboardingStep: currentStep }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to save progress");
    }
  };

  const isNextDisabled = () => {
    if (step === 1) return !formData.firstName?.trim();
    if (step === 2) return !formData.lastName?.trim();
    if (step === 3)
      return !formData.username?.trim() || usernameValidation !== "available";
    if (step === 5) return !ageTouched;
    if (step === 6) return !weightTouched;
    if (step === 7) return !heightTouched;
    if (step === 10) return !moodTouched;
    return false;
  };

  const handleNext = async () => {
    setError(null);
    setIsLoading(true);
    try {
      if (step < TOTAL_STEPS) {
        await saveProgress(step + 1);
        setStep((s) => s + 1);
      } else {
        await handleSubmit();
      }
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const handleSkip = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const updates =
        step === 10 || step === 11
          ? { moodValue: undefined, moodNote: undefined }
          : undefined;
      if (updates) updateData(updates);
      if (step < TOTAL_STEPS) {
        await saveProgress(step + 1, updates);
        setStep((s) => s + 1);
      } else {
        await handleSubmit();
      }
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setIsLoading(true);

    try {
      if (formData.moodValue !== undefined) {
        localStorage.setItem(
          "chroniqo_onboarding_mood",
          JSON.stringify({
            value: formData.moodValue,
            note: formData.moodNote,
          }),
        );
      }

      console.log("[OnboardingForm] Submitting profile:", formData);

      const finalData = { ...formData, onboardingStep: 11 };
      delete finalData.moodValue;
      delete finalData.moodNote;

      const res = await fetch("/api/user/onboard", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save profile");
      }

      console.log("[OnboardingForm] Profile saved successfully");

      // Fire verification email in the background - not awaited, must not block the welcome screen
      fetch("/api/users/settings/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend-verification" }),
      }).catch((err) =>
        console.error(
          "[OnboardingForm] Failed to trigger verification email:",
          err,
        ),
      );

      // Navigate directly to the feed
      await update({ onboarded: true, username: formData.username ?? null });
      setShowWelcome(true);
      setTimeout(() => {
        router.push(`/${locale}/feed`);
        router.refresh();
      }, 3000);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("An unexpected error occurred");
      console.error("[OnboardingForm] Error:", err);
      setIsLoading(false);
    }
  };

  // Map step number to title keys
  const getStepTitle = () => {
    switch (step) {
      case 1:
        return t("onboarding.step_firstName_title");
      case 2:
        return t("onboarding.step_lastName_title");
      case 3:
        return t("onboarding.step_username_title");
      case 4:
        return t("onboarding.step_gender_title");
      case 5:
        return t("onboarding.step_age_title");
      case 6:
        return t("onboarding.step_weight_title");
      case 7:
        return t("onboarding.step_height_title");
      case 8:
        return t("onboarding.step_illness_title");
      case 9:
        return t("onboarding.step_medications_title");
      case 10:
        return t("onboarding.step_mood_title");
      case 11:
        return t("onboarding.step_note_title");
      default:
        return "";
    }
  };

  // Map step number to component
  const renderStepComponent = () => {
    const props = { data: formData, updateData };
    switch (step) {
      case 1:
        return <StepFirstName {...props} />;
      case 2:
        return <StepLastName {...props} />;
      case 3:
        return (
          <StepUsername {...props} onValidationChange={setUsernameValidation} />
        );
      case 4:
        return <StepGender {...props} />;
      case 5:
        return <StepAge {...props} onFirstChange={() => setAgeTouched(true)} />;
      case 6:
        return (
          <StepWeight {...props} onFirstChange={() => setWeightTouched(true)} />
        );
      case 7:
        return (
          <StepHeight {...props} onFirstChange={() => setHeightTouched(true)} />
        );
      case 8:
        return <StepIllnesses {...props} />;
      case 9:
        return <StepMedications {...props} />;
      case 10:
        return (
          <StepMood {...props} onFirstChange={() => setMoodTouched(true)} />
        );
      case 11:
        return <StepNote {...props} />;
      default:
        return null;
    }
  };

  // Show email verification gate if not verified
  if (!isVerified) {
    return (
      <EmailVerificationGate
        email={userEmail}
        onVerified={() => setIsVerified(true)}
      />
    );
  }

  if (isInitializing) {
    return (
      <div className="flex-1 flex items-center justify-center text-foreground-40">
        {t("onboarding.loading")}
      </div>
    );
  }
  return (
    <>
      {/* Left Pane */}
      <div className="lg:flex-1 flex flex-col items-start shrink-0">
        <div className="flex items-center gap-4 mb-6 lg:mb-8">
          <button
            type="button"
            onClick={
              step === 1
                ? () => signOut({ callbackUrl: `/${locale}/login` })
                : handleBack
            }
            disabled={isLoading}
            className="w-10 h-10 flex items-center justify-center rounded-full border border-surface-border hover:bg-foreground/5 transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            aria-label="Go back"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
              {t("onboarding.header_title")}
            </h2>
            <p className="text-xs font-semibold text-brand mt-0.5">
              {/* String replacement logic for 'Step X of Y' */}
              {t("onboarding.step_of")
                .replace("{{current}}", step.toString())
                .replace("{{total}}", TOTAL_STEPS.toString())}
            </p>
          </div>
        </div>

        <div className="animate-in fade-in slide-in-from-left-4 duration-300">
          <h1 className="text-3xl sm:text-4xl font-heading text-foreground mb-4 pr-4">
            {getStepTitle()}
          </h1>
        </div>
      </div>

      {/* Right Pane */}
      <form
        className="lg:flex-[1.2] flex flex-col h-full w-full relative"
        onSubmit={(e) => {
          e.preventDefault();
          handleNext();
        }}
      >
        <div className="flex flex-col w-full h-full flex-1">
          {/* Active Step Content */}
          <div className="flex-1 flex flex-col justify-start lg:justify-center min-h-[250px]">
            {error && (
              <div className="p-3 text-sm text-white bg-brand rounded-xl mb-4 animate-in fade-in">
                {error}
              </div>
            )}
            {renderStepComponent()}
          </div>

          {/* Bottom Actions */}
          <div className="mt-8 lg:mt-auto pt-4 flex flex-row items-center justify-between w-full gap-2 shrink-0">
            <div className="flex-shrink-0">
              {[4, 6, 7, 8, 9, 11].includes(step) && (
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={isLoading}
                  className="text-sm font-semibold text-foreground-60 hover:text-foreground px-3 py-2 rounded-full transition-colors -ml-3 cursor-pointer"
                >
                  {step === 4
                    ? t("onboarding.prefer_to_skip")
                    : t("onboarding.skip")}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="submit"
                disabled={isLoading || isNextDisabled()}
                className="px-6 py-2.5 rounded-full text-sm h-[42px] shrink-0 cursor-pointer"
              >
                {isLoading
                  ? t("onboarding.saving")
                  : step === TOTAL_STEPS
                    ? t("onboarding.finish")
                    : t("onboarding.continue")}
              </Button>
            </div>
          </div>
        </div>
      </form>
      {/* Welcome overlay */}
      {showWelcome && (
        <OnboardingWelcome
          username={formData.username || formData.firstName || ""}
        />
      )}
    </>
  );
}
