// src/lib/hooks/use-touch-device.ts
import * as React from "react";

export function useTouchDevice() {
  const [isTouch, setIsTouch] = React.useState(false);
  React.useEffect(() => {
    const mql = window.matchMedia("(hover: none) and (pointer: coarse)");
    setIsTouch(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsTouch(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return isTouch;
}
