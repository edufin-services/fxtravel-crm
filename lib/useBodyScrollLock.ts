"use client";

import { useEffect } from "react";

let activeModals = 0;

/**
 * Hook to lock background body scroll while a modal/popup is open.
 * Guarantees that body scroll is unconditionally restored to normal when modals close.
 */
export function useBodyScrollLock(enabled: boolean = true) {
  useEffect(() => {
    if (typeof document === "undefined") return;

    if (!enabled) {
      if (activeModals <= 0) {
        activeModals = 0;
        document.body.style.overflow = "";
        document.body.classList.remove("modal-open");
      }
      return;
    }

    activeModals++;
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");

    return () => {
      activeModals = Math.max(0, activeModals - 1);
      if (activeModals === 0) {
        document.body.style.overflow = "";
        document.body.classList.remove("modal-open");
      }
    };
  }, [enabled]);
}
