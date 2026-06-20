// src/components/auth/remember-me-watcher.tsx
"use client";

import { signOut } from "next-auth/react";
import { useEffect } from "react";

export function RememberMeWatcher() {
  useEffect(() => {
    // Check if this browser tab/window already has an active session state
    const hasSession = sessionStorage.getItem("chroniqo_session");

    if (!hasSession) {
      // This is a new tab/window session. Evaluate the remember me flag.
      const rememberData = localStorage.getItem("chroniqo_remember");

      if (!rememberData) {
        // User explicitly chose not to be remembered. Clear Auth.js session.
        signOut({ callbackUrl: "/login", redirect: true });
        return;
      }

      // If they chose to be remembered, verify the 30-day timestamp hasn't elapsed.
      const expiry = parseInt(rememberData, 10);
      if (isNaN(expiry) || Date.now() > expiry) {
        localStorage.removeItem("chroniqo_remember");
        signOut({ callbackUrl: "/login", redirect: true });
        return;
      }

      // Session is valid and user chose "Remember me" -> Promote to active tab session
      sessionStorage.setItem("chroniqo_session", "1");
    }
  }, []);

  return null;
}
