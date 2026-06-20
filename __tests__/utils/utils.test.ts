// __tests__/utils/utils.test.ts

/*
 * This file tests utility functions that are not specific to a single service or component,
 * such as the Tailwind class merging function (cn) and the day suffix function.
 */

import { cn, daySuffix } from "@/lib/utils";

describe("Utility Functions", () => {
  describe("cn (Tailwind Merge)", () => {
    it("should merge conflicting tailwind classes correctly", () => {
      const result = cn("px-2 py-1 bg-red-500", "bg-blue-500", {
        "text-white": true,
      });
      // bg-blue-500 should override bg-red-500
      expect(result).toBe("px-2 py-1 bg-blue-500 text-white");
    });

    it("should handle undefined and null values gracefully", () => {
      const result = cn(
        "base-class",
        null,
        undefined,
        false && "hidden",
        "active",
      );
      expect(result).toBe("base-class active");
    });
  });

  describe("daySuffix", () => {
    it("should return correct Danish suffix", () => {
      expect(daySuffix(1, "da")).toBe("1.");
      expect(daySuffix(22, "da")).toBe("22.");
    });

    it("should return correct English suffixes", () => {
      expect(daySuffix(1, "en")).toBe("1st");
      expect(daySuffix(2, "en")).toBe("2nd");
      expect(daySuffix(3, "en")).toBe("3rd");
      expect(daySuffix(4, "en")).toBe("4th");
      expect(daySuffix(11, "en")).toBe("11th");
      expect(daySuffix(21, "en")).toBe("21st");
      expect(daySuffix(22, "en")).toBe("22nd");
      expect(daySuffix(23, "en")).toBe("23rd");
    });
  });
});
