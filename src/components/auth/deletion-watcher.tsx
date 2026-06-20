// src/components/auth/deletion-watcher.tsx
"use client";

import { POLL_INTERVAL_MS } from "@/lib/constants";
import { signOut, useSession } from "next-auth/react";
import { useEffect } from "react";

// Side-effect only component - renders nothing.
// Polls /api/auth/session-check every 30 seconds.
// On a positive deletion flag it signs the user out and redirects to the
// login page with ?accountDeleted=true so the modal can be shown.
export function DeletionWatcher() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;

    const check = async () => {
      try {
        const res = await fetch("/api/auth/session-check");
        if (!res.ok) return;

        const data = (await res.json()) as {
          valid: boolean;
          banned: boolean;
          deleted: boolean;
        };
        if (!data.deleted) return;

        console.log(
          "[Deletion Watcher] Account deletion detected - signing out",
        );

        const locale = window.location.pathname.split("/")[1] || "da";

        await signOut({
          redirect: true,
          callbackUrl: `/${locale}/login?accountDeleted=true`,
        });
      } catch {
        // Network error - fail silently, retry next cycle
      }
    };

    check();
    const id = setInterval(check, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [status, session?.user?.id]);

  return null;
}
