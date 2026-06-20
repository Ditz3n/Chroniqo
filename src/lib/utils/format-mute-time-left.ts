export function formatMuteTimeLeft(
  expiresAt: string | Date,
  nowMs: number = Date.now(),
): string {
  const expiresMs = new Date(expiresAt).getTime();
  const remainingSeconds = Math.max(0, Math.floor((expiresMs - nowMs) / 1000));

  if (remainingSeconds > 24 * 60 * 60) {
    const days = Math.floor(remainingSeconds / (24 * 60 * 60));
    return `${days}d`;
  }

  if (remainingSeconds >= 60 * 60) {
    const hours = Math.floor(remainingSeconds / (60 * 60));
    const minutes = Math.floor((remainingSeconds % (60 * 60)) / 60);
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  }

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}
