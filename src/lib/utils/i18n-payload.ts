import { NotificationI18nPayload } from "@/types/app-types";

type TranslationFn = (
  key: string,
  params?: Record<string, string | number>,
) => string;

export const toI18nPayload = (
  key: string,
  params: Record<string, string> = {},
) => JSON.stringify({ key, params });

export const parseI18nPayload = (
  value?: string | null,
): NotificationI18nPayload | null => {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "key" in parsed &&
      typeof (parsed as { key: unknown }).key === "string" &&
      "params" in parsed &&
      typeof (parsed as { params: unknown }).params === "object" &&
      (parsed as { params: unknown }).params !== null
    ) {
      const paramsObj = (parsed as { params: Record<string, unknown> }).params;
      const params: Record<string, string> = {};

      for (const [k, v] of Object.entries(paramsObj)) {
        if (typeof v === "string") params[k] = v;
      }

      return {
        key: (parsed as { key: string }).key,
        params,
      };
    }
  } catch {
    return null;
  }

  return null;
};

export const fillI18nTemplate = (
  template: string,
  replacements: Record<string, string>,
) => {
  return Object.entries(replacements).reduce(
    (acc, [key, value]) => acc.replace(`{{${key}}}`, value),
    template,
  );
};

export const resolveChatSystemMessage = (
  content: string,
  messageType: string | null | undefined,
  senderName: string | null | undefined,
  t: TranslationFn,
) => {
  const payload = parseI18nPayload(content);
  if (payload) {
    return fillI18nTemplate(t(payload.key), payload.params);
  }

  if (messageType === "REQUEST_ACCEPTED") {
    return t("chat_requests.accepted_msg", {
      user: senderName || "Unknown",
    });
  }

  return content;
};

// Maps Prisma enum value to da/en.json key suffix under "minigames"
const GAME_TYPE_KEY_MAP: Record<string, string> = {
  TIC_TAC_TOE: "tic_tac_toe",
  CONNECT_FOUR: "connect_four",
  KNUCKLEBONES: "knucklebones",
};

/**
 * Converts a game system message's JSON payload into a human-readable
 * preview string for the chat list / sidebar. Does not personalise the
 * winner text with "Du" because the caller's userId is not available here.
 */
export function resolveGameMessagePreview(
  content: string,
  messageType: string,
  t: TranslationFn,
): string {
  let payload: Record<string, string | null | undefined> = {};
  try {
    payload = JSON.parse(content) as Record<string, string | null | undefined>;
  } catch {
    return content;
  }

  const gameKeyFragment = payload.gameType
    ? (GAME_TYPE_KEY_MAP[payload.gameType] ?? null)
    : null;
  const gameName = gameKeyFragment
    ? t(`minigames.${gameKeyFragment}`)
    : t("minigames.default_game_name");

  const displayName = (payloadKey: string, fallbackKey: string): string =>
    payload[payloadKey] ? `u/${payload[payloadKey]}` : t(fallbackKey);

  switch (messageType) {
    case "GAME_CHALLENGE":
      return t("minigames.preview_challenge", {
        username: displayName(
          "challengerUsername",
          "minigames.preview_unknown_player",
        ),
        game: gameName,
      });
    case "GAME_ACCEPTED":
      return t("minigames.preview_accepted", {
        username: displayName("accepterUsername", "minigames.preview_opponent"),
      });
    case "GAME_DECLINED":
      return t("minigames.preview_declined", {
        username: displayName("actorUsername", "minigames.preview_opponent"),
      });
    case "GAME_CANCELLED":
      return t("minigames.preview_cancelled", {
        username: displayName("actorUsername", "minigames.preview_a_player"),
      });
    case "GAME_WITHDRAWN":
      return t("minigames.preview_withdrawn", {
        username: displayName("actorUsername", "minigames.preview_a_player"),
      });
    case "GAME_WIN":
      return payload.winnerUsername
        ? t("minigames.preview_won", {
            username: `u/${payload.winnerUsername}`,
            game: gameName,
          })
        : t("minigames.preview_ended", { game: gameName });
    case "GAME_DRAW":
      return t("minigames.preview_draw", { game: gameName });
    default:
      return content;
  }
}
