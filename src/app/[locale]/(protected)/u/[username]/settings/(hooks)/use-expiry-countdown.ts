// src/app/[locale]/(protected)/u/[username]/settings/(hooks)/use-expiry-countdown.ts
import { useEffect, useRef, useState } from "react";

// Utility function to format the expiry time as a string (e.g., "5m", "1h 30m").
function formatExpiry(expiresAt: Date): string {
  const ms = expiresAt.getTime() - Date.now();
  if (ms <= 0) return "";
  const totalSeconds = Math.ceil(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const totalMinutes = Math.ceil(totalSeconds / 60);
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${totalMinutes}m`;
}

// Custom hook to manage expiry countdown for a given expiry date.
export function useExpiryCountdown(
  expiresAt: Date | null,
  onExpire?: () => void,
): [string, (date: Date | null) => void] {
  const [timeLeft, setTimeLeft] = useState("");
  const expiredRef = useRef(false);

  useEffect(() => {
    expiredRef.current = false;
    const tick = () => {
      if (!expiresAt) {
        setTimeLeft("");
        return;
      }
      const left = formatExpiry(expiresAt);
      setTimeLeft(left);
      if (!left && !expiredRef.current) {
        expiredRef.current = true;
        if (onExpire) onExpire();
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  // setExpiry is now a no-op; expiry is controlled by the prop
  const setExpiry = () => {
    throw new Error("setExpiry is not supported; control expiry via the prop");
  };

  return [timeLeft, setExpiry];
}
