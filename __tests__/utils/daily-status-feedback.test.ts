// __tests__/utils/daily-status-feedback.test.ts

/*
 * This file tests the getDailyStatusFeedback function, which generates
 * user feedback messages based on the daily status value (0-4).
 * The function relies on a translation function to produce the final message,
 * so both the correct key generation and the delegation to the translation function are tested.
 */

import { getDailyStatusFeedback } from "@/lib/utils/daily-status-feedback";

describe("getDailyStatusFeedback", () => {
  const t = (key: string) => key;

  it.each([0, 1, 2, 3, 4])(
    "returns the correct translation key for level %i",
    (value) => {
      expect(getDailyStatusFeedback(value, t)).toBe(
        `dailyStatus.feedback_${value}`,
      );
    },
  );

  it("returns the value produced by the translation function", () => {
    const tMock = jest.fn((key: string) => `translated:${key}`);
    const result = getDailyStatusFeedback(3, tMock);
    expect(tMock).toHaveBeenCalledWith("dailyStatus.feedback_3");
    expect(result).toBe("translated:dailyStatus.feedback_3");
  });

  it("delegates fully to t - does not hardcode any message strings", () => {
    const tA = () => "version A";
    const tB = () => "version B";
    expect(getDailyStatusFeedback(2, tA)).toBe("version A");
    expect(getDailyStatusFeedback(2, tB)).toBe("version B");
  });
});
