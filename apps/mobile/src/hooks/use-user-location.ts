import type { Coordinates } from "@wartownik/shared/types/map";
import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";

const LAST_KNOWN_MAX_AGE_MS = 5 * 60 * 1000;

async function readLocation(): Promise<Coordinates | null> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    return null;
  }
  const last = await Location.getLastKnownPositionAsync({
    maxAge: LAST_KNOWN_MAX_AGE_MS,
  });
  const position =
    last ??
    (await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    }));
  return { lat: position.coords.latitude, lng: position.coords.longitude };
}

export function useUserLocation() {
  const [location, setLocation] = useState<Coordinates | null>(null);

  const refresh = useCallback(async () => {
    const next = await readLocation().catch(() => null);
    if (next !== null) {
      setLocation(next);
    }
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;
    readLocation()
      .then((next) => {
        if (!cancelled && next !== null) {
          setLocation(next);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return { location, refresh };
}
