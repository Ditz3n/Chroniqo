// src/lib/constants.ts
export interface DailyStatusConfig {
  value: number;
  labelKey: string;
  color: string;
}

// Represents the 1-5 scale for daily status, with associated label keys and colors
export const DAILY_STATUSES: DailyStatusConfig[] = [
  { value: 0, labelKey: "dailyStatus.exhausted", color: "#A591F5" },
  { value: 1, labelKey: "dailyStatus.low_energy", color: "#EB7D19" },
  { value: 2, labelKey: "dailyStatus.neutral", color: "#915F46" },
  { value: 3, labelKey: "dailyStatus.good_periods", color: "#FFCD5A" },
  { value: 4, labelKey: "dailyStatus.full_energy", color: "#9BAF64" },
];

// Represents the background classes for each daily status value, used in the calendar view and editor
export const DAILY_STATUS_BG_CLASSES = [
  "bg-[var(--color-dailystatus-exhausted)]",
  "bg-[var(--color-dailystatus-low-energy)]",
  "bg-[var(--color-dailystatus-neutral)]",
  "bg-[var(--color-dailystatus-good-periods)]",
  "bg-[var(--color-dailystatus-full-energy)]",
] as const;

// Represents keys for condition and medication suggestions during onboarding,
// used to fetch localized labels and icons
export const CONDITION_SUGGESTION_KEYS = [
  "onboarding.illnesses.diabetes",
  "onboarding.illnesses.hypertension",
  "onboarding.illnesses.asthma",
  "onboarding.illnesses.anxiety",
  "onboarding.illnesses.depression",
  "onboarding.illnesses.arthritis",
  "onboarding.illnesses.migraine",
  "onboarding.illnesses.epilepsy",
  "onboarding.illnesses.ibs",
  "onboarding.illnesses.chronic_pain",
] as const;

export const MEDICATION_SUGGESTION_KEYS = [
  "onboarding.medications.metformin",
  "onboarding.medications.ibuprofen",
  "onboarding.medications.paracetamol",
  "onboarding.medications.lisinopril",
  "onboarding.medications.atorvastatin",
  "onboarding.medications.omeprazole",
  "onboarding.medications.sertraline",
  "onboarding.medications.salbutamol",
  "onboarding.medications.levothyroxine",
  "onboarding.medications.amoxicillin",
] as const;

export const POLL_OPTIONS_MIN = 2;
export const POLL_OPTIONS_MAX = 6;
export const POLL_OPTION_TEXT_MAX = 60;

// --- search-bar constants ---
export const POPOVER_CLOSE_DURATION_MS = 200;

// --- search-results-view constants ---
// Caps the heading display length - the full query still reaches the API
export const DISPLAY_QUERY_MAX = 60;

// Items shown per section in the global overview before "Show more"
export const OVERVIEW_USERS = 3;
export const OVERVIEW_COMMUNITIES = 3;
export const OVERVIEW_POSTS = 5;

// --- search-storage constants ---
// Keys and limits for recent searches and queries stored in localStorage
export const RECENTS_KEY = "chroniqo:recent_searches";
export const QUERIES_KEY = "chroniqo:recent_queries";
export const MAX_ITEMS = 5;

// --- user limits constants ---
export const BIO_MAX_LENGTH = 150;
export const USERNAME_COOLDOWN_DAYS = 30;
export const USERNAME_MAX = 30;

export const POLL_INTERVAL_MS = 30_000;

// TTL of 1 hour is well above the 30-second poll interval.
// The key auto-expires so no cleanup job is needed.
export const BAN_FLAG_TTL_SECONDS = 3600;

// Pastel palette for icon picker (CSS variable and hex for each color)
export const ICON_PALETTE: { label: string; css: string; hex: string }[] = [
  { label: "Rose", css: "var(--palette-rose)", hex: "#F5A3B9" },
  { label: "Coral", css: "var(--palette-coral)", hex: "#FFB199" },
  { label: "Peach", css: "var(--palette-peach)", hex: "#FFD6A5" },
  { label: "Butter", css: "var(--palette-butter)", hex: "#FFF6A5" },
  { label: "Sage", css: "var(--palette-sage)", hex: "#D1E7C6" },
  { label: "Mint", css: "var(--palette-mint)", hex: "#B6F5E1" },
  { label: "Sky", css: "var(--palette-sky)", hex: "#A8D4F5" },
  { label: "Periwinkle", css: "var(--palette-periwinkle)", hex: "#B3C7F5" },
  { label: "Lavender", css: "var(--palette-lavender)", hex: "#D1B3F5" },
  { label: "Lilac", css: "var(--palette-lilac)", hex: "#E1B3F5" },
  { label: "Smoke", css: "var(--palette-smoke)", hex: "#D3D3D3" },
  { label: "Slate", css: "var(--palette-slate)", hex: "#A5A5B6" },
  { label: "Sand", css: "var(--palette-sand)", hex: "#F5E3C3" },
  { label: "Stone", css: "var(--palette-stone)", hex: "#C3B8A5" },
  { label: "Charcoal", css: "var(--palette-charcoal)", hex: "#5A5A5A" },
  { label: "Midnight", css: "var(--palette-midnight)", hex: "#232946" },
];
