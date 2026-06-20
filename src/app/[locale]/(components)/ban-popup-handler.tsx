// src/app/[locale]/(components)/ban-popup-handler.tsx
"use client";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function BanPopupHandler() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        {
          type: "OAUTH_BANNED",
          token: searchParams.get("token"),
          reason: searchParams.get("reason"),
          expires: searchParams.get("expires"),
          dataAlreadyDeleted: searchParams.get("dataAlreadyDeleted") === "true",
        },
        window.location.origin,
      );
      window.close();
    }
  }, [searchParams]);

  return null;
}
