// src/lib/utils/emoji-utils.ts
import {
  emojiData,
  skinToneColors,
  skinToneEmojis,
  type CategoryKey,
  type EmojiObj,
} from "@/lib/emoji-data";

export type { EmojiObj };
export const EMOJI_DATA = emojiData;
export const SKIN_TONE_COLORS = skinToneColors;

export const supportsSkinTone = (emoji: string): boolean => {
  const cleanEmoji = emoji.replace(/[\u{1F3FB}-\u{1F3FF}]/gu, "");
  return skinToneEmojis.has(cleanEmoji);
};

export const findEmojiKey = (emoji: string): string => {
  const cleanEmoji = emoji.replace(/[\u{1F3FB}-\u{1F3FF}]/gu, "");
  for (const category of Object.values(EMOJI_DATA)) {
    const found = category.find((e) => e.c === cleanEmoji || e.c === emoji);
    if (found) return found.k;
  }
  return "";
};

export const filterEmojis = (
  query: string,
  t: (key: string) => string,
): Record<CategoryKey, EmojiObj[]> => {
  if (!query) return EMOJI_DATA;
  const lowerQuery = query.toLowerCase();
  const filtered: Partial<Record<CategoryKey, EmojiObj[]>> = {};

  (Object.entries(EMOJI_DATA) as [CategoryKey, EmojiObj[]][]).forEach(
    ([category, emojis]) => {
      const matchingEmojis = emojis.filter((emojiObj) => {
        const name = t(`Emojis.names.${emojiObj.k}`);
        return name.toLowerCase().includes(lowerQuery);
      });
      if (matchingEmojis.length > 0) filtered[category] = matchingEmojis;
    },
  );
  return filtered as Record<CategoryKey, EmojiObj[]>;
};

export const applySkinTone = (
  emojis: EmojiObj[],
  skinTone: string | null,
): EmojiObj[] => {
  if (!skinTone) return emojis;
  return emojis.map((emojiObj) => {
    if (supportsSkinTone(emojiObj.c)) {
      const cleanEmoji = emojiObj.c.replace(/[\u{1F3FB}-\u{1F3FF}]/gu, "");
      return { ...emojiObj, c: cleanEmoji + skinTone };
    }
    return emojiObj;
  });
};

export const getAlignmentStyle = (align: "left" | "right" | "center") => {
  switch (align) {
    case "right":
      return "right-0";
    case "center":
      return "left-1/2 -translate-x-1/2";
    case "left":
    default:
      return "left-0";
  }
};

export class RecentlyUsedEmojis {
  private static MAX_ITEMS = 32;
  private static STORAGE_KEY = "recently_used_emojis";
  private emojis: string[] = [];

  constructor() {
    if (typeof window !== "undefined") this.load();
  }

  private load() {
    try {
      const stored = localStorage.getItem(RecentlyUsedEmojis.STORAGE_KEY);
      if (stored) this.emojis = JSON.parse(stored);
    } catch (e) {
      console.error("Failed to load recently used emojis:", e);
    }
  }

  private save() {
    try {
      localStorage.setItem(
        RecentlyUsedEmojis.STORAGE_KEY,
        JSON.stringify(this.emojis),
      );
    } catch (e) {
      console.error("Failed to save recently used emojis:", e);
    }
  }

  addEmoji(emoji: string) {
    this.emojis = this.emojis.filter((e) => e !== emoji);
    this.emojis.unshift(emoji);
    if (this.emojis.length > RecentlyUsedEmojis.MAX_ITEMS) {
      this.emojis = this.emojis.slice(0, RecentlyUsedEmojis.MAX_ITEMS);
    }
    this.save();
  }

  clear() {
    this.emojis = [];
    this.save();
  }

  getEmojis(): string[] {
    return this.emojis;
  }
}

export const recentlyUsedManager = new RecentlyUsedEmojis();
