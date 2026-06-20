// __tests__/utils/emoji-utils.test.ts

/*
 * This file tests the emoji utility functions,
 * specifically the logic for applying skin tones to emojis that support them.
 */

import { applySkinTone, supportsSkinTone } from "@/lib/utils/emoji-utils";

describe("Emoji Utilities", () => {
  describe("supportsSkinTone", () => {
    it("should return true for emojis that support skin tones (e.g., thumbs up)", () => {
      expect(supportsSkinTone("👍")).toBe(true);
    });

    it("should return false for emojis that do not support skin tones (e.g., standard smiley)", () => {
      expect(supportsSkinTone("😀")).toBe(false);
    });
  });

  describe("applySkinTone", () => {
    const mockEmojis = [
      { c: "👍", k: "thumbs_up" },
      { c: "😀", k: "grinning" },
    ];

    it("should apply skin tone only to supported emojis", () => {
      const darkSkinTone = "\u{1F3FF}"; // Dark skin tone modifier
      const result = applySkinTone(mockEmojis, darkSkinTone);

      expect(result[0].c).toBe("👍🏿"); // Modified
      expect(result[1].c).toBe("😀"); // Unmodified
    });

    it("should return the original array if skinTone is null", () => {
      const result = applySkinTone(mockEmojis, null);
      expect(result).toEqual(mockEmojis);
    });
  });
});
