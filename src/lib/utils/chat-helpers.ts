type ChatUserLike = {
  id?: string | null;
  name?: string | null;
  username?: string | null;
};

type ChatParticipantLike = {
  nickname?: string | null;
  user?: ChatUserLike | null;
};

type ChatConversationLike = {
  name?: string | null;
  participants?: ChatParticipantLike[] | null;
};

const getParticipantDisplayName = (participant: ChatParticipantLike) =>
  participant.nickname?.trim() ||
  participant.user?.name?.trim() ||
  participant.user?.username?.trim() ||
  "";

export function getChatDisplayName(
  conversation: ChatConversationLike | null | undefined,
  currentUserId?: string | null,
  fallback = "...",
) {
  const explicitName = conversation?.name?.trim();
  if (explicitName) return explicitName;

  const participants = conversation?.participants ?? [];
  const otherParticipants = currentUserId
    ? participants.filter((p) => p.user?.id !== currentUserId)
    : participants;

  const computedName = otherParticipants
    .map(getParticipantDisplayName)
    .filter(Boolean)
    .join(", ");

  return computedName || fallback;
}
