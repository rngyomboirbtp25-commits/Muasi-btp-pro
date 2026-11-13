export type ElementBeton = 'dalle' | 'poteau' | 'semelle' | 'mur';

export const ELEMENTS_BETON: { value: ElementBeton; label: string }[] = [
  { value: 'dalle', label: 'Dalle' },
  { value: 'poteau', label: 'Poteau' },
  { value: 'semelle', label: 'Semelle' },
  { value: 'mur', label: 'Mur' },
];

/** Libellés des 3 dimensions selon l'élément (toutes en mètres). */
export const DIMENSIONS_BETON: Record<ElementBeton, [string, string, string]> = {
  dalle: ['Longueur', 'Largeur', 'Épaisseur'],
  poteau: ['Côté a', 'Côté b', 'Hauteur'],
  semelle: ['Longueur', 'Largeur', 'Hauteur'],
  mur: ['Longueur', 'Hauteur', 'Épaisseur'],
};

/** Dosages courants (kg de ciment par m³ de béton). */
export const DOSAGES = [250, 300, 350, 400] as const;

// Pour 1 m³ de béton (granulats secs) — valeurs usuelles de chantier.
export const SABLE_M3_PAR_M3 = 0.4; // 400 L de sable
export const GRAVIER_M3_PAR_M3 = 0.8; // 800 L de gravier
export const RAPPORT_EAU_CIMENT = 0.5; // E/C ≈ 0,5 → 175 L pour 350 kg
export const SAC_CIMENT_KG = 50;

export type PrixBeton = {
  sacCiment: number; // prix par sac de 50 kg
  sable: number; // prix par m³
  gravier: number; // prix par m³
  eau: number; // prix par m³
};

export type ResultatBeton = {
  volumeNet: number; // m³
  volume: number; // m³ avec marge de perte
  cimentKg: number;
  sacs: number;
  sableM3: number;
  gravierM3: number;
  eauL: number;
  cout: { ciment: number; sable: number; gravier: number; eau: number; total: number };
};

export function calculBeton(params: {
  dims: [number, number, number];
  nombre: number;
  marge: number; // en %
  dosage: number; // kg/m³
  prix: PrixBeton;
}): ResultatBeton {
  const [a, b, c] = params.dims;
  const n = Math.max(0, params.nombre);
  const volumeNet = Math.max(0, a) * Math.max(0, b) * Math.max(0, c) * n;
  const volume = volumeNet * (1 + params.marge / 100);

  const cimentKg = volume * params.dosage;
  const sacs = Math.ceil(cimentKg / SAC_CIMENT_KG - 1e-9);
  const sableM3 = volume * SABLE_M3_PAR_M3;
  const gravierM3 = volume * GRAVIER_M3_PAR_M3;
  const eauL = cimentKg * RAPPORT_EAU_CIMENT;

  const ciment = sacs * params.prix.sacCiment;
  const sable = sableM3 * params.prix.sable;
  const gravier = gravierM3 * params.prix.gravier;
  const eau = (eauL / 1000) * params.prix.eau;

  return {
    volumeNet,
    volume,
    cimentKg,
    sacs,
    sableM3,
    gravierM3,
    eauL,
    cout: { ciment, sable, gravier, eau, total: ciment + sable + gravier + eau },
  };
}
