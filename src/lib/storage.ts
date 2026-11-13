import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';

const PREFIX = 'chantierpro:';

export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw);
    // Fusion superficielle pour les objets : tolère l'ajout de nouveaux champs.
    if (
      parsed && typeof parsed === 'object' && !Array.isArray(parsed) &&
      fallback && typeof fallback === 'object' && !Array.isArray(fallback)
    ) {
      return { ...fallback, ...parsed };
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

export async function saveJSON<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // stockage indisponible : on ignore, l'app reste utilisable
  }
}

/**
 * État React sauvegardé automatiquement sur le téléphone (hors ligne).
 * Retourne [valeur, setter, chargé].
 */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);
  const initialRef = useRef(initial);

  useEffect(() => {
    let alive = true;
    loadJSON(key, initialRef.current).then((v) => {
      if (alive) {
        setValue(v);
        setLoaded(true);
      }
    });
    return () => {
      alive = false;
    };
  }, [key]);

  useEffect(() => {
    if (loaded) saveJSON(key, value);
  }, [key, value, loaded]);

  return [value, setValue, loaded] as const;
}
