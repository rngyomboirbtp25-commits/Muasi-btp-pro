import React, { createContext, useContext } from 'react';
import { usePersistentState } from './storage';

/** Ligne prête à être importée dans un devis. */
export type ImportLine = {
  designation: string;
  quantite: number;
  unite: string;
  prixUnitaire: number;
};

export type CalcExport = {
  titre: string; // résumé lisible, ex. "Dalle 5 × 4 × 0,15 m"
  date: string; // ISO date-heure
  lignes: ImportLine[];
};

type Settings = { currency: string };

type StoreValue = {
  settings: Settings;
  setSettings: (s: Settings) => void;
  betonExport: CalcExport | null;
  setBetonExport: (e: CalcExport | null) => void;
  ferExport: CalcExport | null;
  setFerExport: (e: CalcExport | null) => void;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = usePersistentState<Settings>('settings', { currency: '€' });
  const [betonExport, setBetonExport] = usePersistentState<CalcExport | null>('export:beton', null);
  const [ferExport, setFerExport] = usePersistentState<CalcExport | null>('export:fer', null);

  return (
    <StoreContext.Provider
      value={{ settings, setSettings, betonExport, setBetonExport, ferExport, setFerExport }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore doit être utilisé dans <StoreProvider>');
  return ctx;
}
