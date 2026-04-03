import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * Reads `highlightMissing` from navigation state.
 * Returns true for 10 seconds or until the user interacts, then false.
 */
export function useHighlightMissing(): boolean {
  const location = useLocation();
  const state = location.state as { highlightMissing?: boolean } | null;
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!state?.highlightMissing) return;
    setActive(true);

    const timer = setTimeout(() => setActive(false), 10_000);

    const dismiss = () => {
      setActive(false);
      cleanup();
    };

    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener("click", dismiss);
      window.removeEventListener("keydown", dismiss);
    };

    // Delay attaching listeners so the navigating click doesn't immediately dismiss
    const attachTimer = setTimeout(() => {
      window.addEventListener("click", dismiss, { once: true });
      window.addEventListener("keydown", dismiss, { once: true });
    }, 500);

    return () => {
      cleanup();
      clearTimeout(attachTimer);
    };
  }, [state?.highlightMissing]);

  return active;
}

/** Utility: returns ring classes when highlight is active and value is empty */
export function highlightIfEmpty(active: boolean, value: unknown): string {
  if (!active) return "";
  const isEmpty =
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);
  return isEmpty ? "ring-2 ring-destructive/70 animate-pulse" : "";
}
