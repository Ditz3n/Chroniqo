// src/components/auth/ban-watcher.tsx
"use client";

import { POLL_INTERVAL_MS } from "@/lib/constants";
import { signOut, useSession } from "next-auth/react";
import { useEffect } from "react";

// Side-effect only component - renders nothing.
// Polls /api/auth/session-check every 30 seconds.
// On a positive ban flag it fetches ban details, then calls signOut()
// with all ban parameters so the login page can show the ban modal immediately.
export function BanWatcher() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;

    const check = async () => {
      try {
        const res = await fetch("/api/auth/session-check");
        if (!res.ok) return;

        const data = (await res.json()) as { valid: boolean; banned: boolean };
        if (!data.banned) return;

        // Fetch full ban details to populate the login page ban modal
        const email = session.user.email;
        const params = new URLSearchParams({ banned: "true" });

        if (email) {
          const banRes = await fetch("/api/auth/banned-account", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });

          if (banRes.ok) {
            const banData = (await banRes.json()) as {
              isBanned: boolean;
              token?: string | null;
              reason?: string | null;
              expires?: string | null;
              dataAlreadyDeleted?: boolean;
            };

            if (banData.token) params.set("token", banData.token);
            if (banData.reason) params.set("reason", banData.reason);
            if (banData.expires) params.set("expires", banData.expires);
            if (banData.dataAlreadyDeleted) {
              params.set("dataAlreadyDeleted", "true");
            }
          }
        }

        // Extract locale from current path so the redirect lands on the correct login page
        const locale = window.location.pathname.split("/")[1] || "da";

        await signOut({
          redirect: true,
          callbackUrl: `/${locale}/login?${params.toString()}`,
        });
      } catch {
        // Network error - fail silently, retry next cycle
      }
    };

    check();
    const id = setInterval(check, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [status, session?.user?.id, session?.user?.email]);

  return null;
}
