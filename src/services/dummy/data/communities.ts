// src/services/dummy/data/communities.ts
import { PASTEL_COLORS } from "./colors";

export const DUMMY_COMMUNITIES: Array<{
  name: string;
  description: string;
  category: string;
  rules: string[];
  isPrivate: boolean;
  avatarEmoji?: string;
  avatarBgColor?: string;
  headerEmoji?: string;
  headerBgColor?: string;
  customAvatarUrl?: string;
  customHeaderUrl?: string;
}> = [
  {
    name: "HerniatedDiscs",
    description: "Support for people with herniated discs and back pain.",
    category: "physical",
    rules: ["No medical advice.", "Be supportive.", "Share recovery tips."],
    isPrivate: false,
    customAvatarUrl:
      "https://images.unsplash.com/photo-1624716346720-6c96dfd07807?q=80&w=1172&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",

    customHeaderUrl:
      "https://images.unsplash.com/photo-1638604813811-6f3c53deff9c?q=80&w=1332&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    name: "ChronicFatigue",
    description: "A safe space to discuss and manage chronic fatigue syndrome.",
    category: "physical",
    rules: [
      "Be respectful and supportive.",
      "No unsolicited medical advice.",
      "Respect privacy.",
    ],
    isPrivate: false,
    avatarEmoji: "😴",
    avatarBgColor: PASTEL_COLORS.slate,
    headerEmoji: "🌙",
    headerBgColor: PASTEL_COLORS.midnight,
  },
  {
    name: "MentalWellness",
    description: "Support for anxiety, depression, and mental health.",
    category: "psychological",
    rules: ["Trigger warnings required.", "Be kind."],
    isPrivate: true,
    avatarEmoji: "🧠",
    avatarBgColor: PASTEL_COLORS.mint,
    headerEmoji: "🌈",
    headerBgColor: PASTEL_COLORS.sage,
  },
  {
    name: "PainSupport",
    description: "Chronic pain warriors unite!",
    category: "physical",
    rules: ["No judgment.", "Share tips.", "Be supportive."],
    isPrivate: false,
    // No avatar/header emoji/bg -> triggers picsum image upload
  },
  {
    name: "DiabetesCare",
    description: "A place for people living with diabetes to share and learn.",
    category: "physical",
    rules: ["No medical advice.", "Share experiences."],
    isPrivate: false,
    avatarEmoji: "🍎",
    avatarBgColor: PASTEL_COLORS.coral,
    headerEmoji: "💉",
    headerBgColor: PASTEL_COLORS.peach,
  },
  {
    name: "AsthmaLife",
    description: "Breathing easy together.",
    category: "physical",
    rules: ["No smoking discussions.", "Be kind."],
    isPrivate: false,
  },
  {
    name: "FibroFriends",
    description: "Support for fibromyalgia and chronic pain.",
    category: "physical",
    rules: ["No negativity.", "Share coping strategies."],
    isPrivate: false,
    avatarEmoji: "🦋",
    avatarBgColor: PASTEL_COLORS.rose,
    headerEmoji: "🌸",
    headerBgColor: PASTEL_COLORS.lilac,
  },
  {
    name: "ArthritisAid",
    description: "Living with arthritis, together.",
    category: "physical",
    rules: ["Be gentle.", "Share resources."],
    isPrivate: false,
  },
  {
    name: "LongCovid",
    description: "For those navigating long COVID symptoms.",
    category: "chronic",
    rules: ["No misinformation.", "Be supportive."],
    isPrivate: true,
    avatarEmoji: "🪫",
    avatarBgColor: PASTEL_COLORS.slate,
    headerEmoji: "🛌",
    headerBgColor: PASTEL_COLORS.smoke,
  },
  {
    name: "HypertensionHub",
    description: "Managing high blood pressure together.",
    category: "physical",
    rules: ["No medical advice.", "Share tips."],
    isPrivate: false,
  },
  {
    name: "ThyroidTalk",
    description: "A place for thyroid health discussions.",
    category: "chronic",
    rules: ["Be supportive.", "Share experiences."],
    isPrivate: false,
    avatarEmoji: "💊",
    avatarBgColor: PASTEL_COLORS.sky,
    headerEmoji: "🏥",
    headerBgColor: PASTEL_COLORS.periwinkle,
  },
];
