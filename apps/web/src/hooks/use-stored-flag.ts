import { useCallback, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function useStoredFlag(key: string, defaultValue: boolean) {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      const stored = read(key);
      return stored === null ? defaultValue : stored === "1";
    },
    () => defaultValue,
  );

  const setValue = useCallback(
    (next: boolean) => {
      try {
        window.localStorage.setItem(key, next ? "1" : "0");
      } catch {}
      for (const listener of listeners) {
        listener();
      }
    },
    [key],
  );

  return [value, setValue] as const;
}
