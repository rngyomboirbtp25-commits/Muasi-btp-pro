export type ElementFer = 'dalle' | 'poteau' | 'semelle' | 'poutre' | 'mur';

export const ELEMENTS_FER: { value: ElementFer; label: string }[] = [
  { value: 'dalle', label: 'Dalle' },
  { value: 'poteau', label: 'Poteau' },
  { value: 'semelle', label: 'Semelle' },
  { value: 'poutre', label: 'Poutre' },
  { value: 'mur', label: 'Mur' },
];

export const DIAMETRES = ['HA6', 'HA8', 'HA10', 'HA12', 'HA14', 'HA16', 'HA20'] as const;
export type Diametre = (typeof DIAMETRES)[number];

/** Poids linéiques (kg/m). */
export const POIDS_LINEIQUE: Record<Diametre, number> = {
  HA6: 0.222,
  HA8: 0.395,
  HA10: 0.617,
  HA12: 0.888,
  HA14: 1.208,
  HA16: 1.578,
  HA20: 2.466,
};

export const DIAMETRE_MM: Record<Diametre, number> = {
  HA6: 6, HA8: 8, HA10: 10, HA12: 12, HA14: 14, HA16: 16, HA20: 20,
};

export const LONGUEUR_COMMERCIALE = 12; // m

/** Libellés des dimensions (m) selon l'élément. */
export const DIMENSIONS_FER: Record<ElementFer, [string, string, string]> = {
  dalle: ['Longueur', 'Largeur', 'Épaisseur'],
  semelle: ['Longueur', 'Largeur', 'Hauteur'],
  mur: ['Longueur', 'Hauteur', 'Épaisseur'],
  poteau: ['Côté a', 'Côté b', 'Hauteur'],
  poutre: ['Largeur b', 'Hauteur h', 'Portée L'],
};

export const AVEC_CADRES: Record<ElementFer, boolean> = {
  dalle: false, semelle: false, mur: false, poteau: true, poutre: true,
};

export type ParamsFer = {
  element: ElementFer;
  dims: [number, number, number]; // m
  nombre: number; // nombre d'éléments identiques
  diametre: Diametre;
  espacement: number; // cm (nappes : dalle, semelle, mur)
  enrobage: number; // cm
  doubleNappe: boolean; // dalle / mur
  nbBarresLong: number; // poteau / poutre
  diametreCadre: Diametre;
  espacementCadres: number; // cm
  marge: number; // % de chute
};

export type GroupeBarres = {
  role: string; // ex. "Barres sens X"
  diametre: Diametre;
  nombre: number;
  longueurUnitaire: number; // m
  longueur: number; // m (nombre × longueur unitaire)
};

export type LigneDiametre = {
  diametre: Diametre;
  nombre: number;
  longueurNette: number; // m
  longueur: number; // m avec chute
  poids: number; // kg avec chute
  barres12m: number;
};

export type ResultatFer = {
  groupes: GroupeBarres[];
  parDiametre: LigneDiametre[];
  nombreBarres: number;
  longueurNette: number;
  longueurTotale: number; // avec chute
  poidsTotal: number; // kg avec chute
  barres12m: number;
  erreur?: string;
};

/** Nombre de barres réparties sur une longueur utile avec un espacement donné. */
function nbRepartition(longueurUtile: number, espacement: number): number {
  if (longueurUtile <= 0 || espacement <= 0) return 0;
  return Math.floor(longueurUtile / espacement + 1e-9) + 1;
}

export function calculFerraillage(p: ParamsFer): ResultatFer {
  const [d1, d2, d3] = p.dims.map((x) => Math.max(0, x)) as [number, number, number];
  const c = Math.max(0, p.enrobage) / 100; // m
  const s = Math.max(0, p.espacement) / 100; // m
  const st = Math.max(0, p.espacementCadres) / 100; // m
  const n = Math.max(0, Math.floor(p.nombre));
  const groupes: GroupeBarres[] = [];
  let erreur: string | undefined;

  const add = (role: string, diametre: Diametre, nombre: number, lu: number) => {
    if (nombre > 0 && lu > 0) {
      groupes.push({ role, diametre, nombre: nombre * n, longueurUnitaire: lu, longueur: nombre * n * lu });
    }
  };

  // Longueur d'un cadre rectangulaire : périmètre intérieur + 2 crochets de 10 Ø.
  const longueurCadre = (cote1: number, cote2: number) => {
    const a = cote1 - 2 * c;
    const b = cote2 - 2 * c;
    if (a <= 0 || b <= 0) return 0;
    return 2 * (a + b) + 2 * 10 * (DIAMETRE_MM[p.diametreCadre] / 1000);
  };

  switch (p.element) {
    case 'dalle':
    case 'semelle': {
      // d1 = longueur (X), d2 = largeur (Y). Quadrillage dans les 2 sens.
      const lx = d1 - 2 * c;
      const ly = d2 - 2 * c;
      if (lx <= 0 || ly <= 0) erreur = "L'enrobage est trop grand pour ces dimensions.";
      if (s <= 0) erreur = "Saisissez un espacement supérieur à 0.";
      const nappes = p.element === 'dalle' && p.doubleNappe ? 2 : 1;
      const suffixe = nappes === 2 ? ' (2 nappes)' : '';
      add(`Barres sens longueur${suffixe}`, p.diametre, nbRepartition(ly, s) * nappes, lx);
      add(`Barres sens largeur${suffixe}`, p.diametre, nbRepartition(lx, s) * nappes, ly);
      break;
    }
    case 'mur': {
      // d1 = longueur, d2 = hauteur
      const l = d1 - 2 * c;
      const h = d2 - 2 * c;
      if (l <= 0 || h <= 0) erreur = "L'enrobage est trop grand pour ces dimensions.";
      if (s <= 0) erreur = "Saisissez un espacement supérieur à 0.";
      const nappes = p.doubleNappe ? 2 : 1;
      const suffixe = nappes === 2 ? ' (2 faces)' : '';
      add(`Barres verticales${suffixe}`, p.diametre, nbRepartition(l, s) * nappes, h);
      add(`Barres horizontales${suffixe}`, p.diametre, nbRepartition(h, s) * nappes, l);
      break;
    }
    case 'poteau': {
      // d1 × d2 section, d3 hauteur
      const h = d3;
      if (st <= 0) erreur = 'Saisissez un espacement de cadres supérieur à 0.';
      add('Barres longitudinales', p.diametre, Math.max(0, Math.floor(p.nbBarresLong)), h);
      const lc = longueurCadre(d1, d2);
      if (lc <= 0) erreur = "L'enrobage est trop grand pour cette section.";
      add('Cadres', p.diametreCadre, nbRepartition(h - 2 * c, st), lc);
      break;
    }
    case 'poutre': {
      // d1 = largeur b, d2 = hauteur h, d3 = portée L
      const l = d3 - 2 * c;
      if (st <= 0) erreur = 'Saisissez un espacement de cadres supérieur à 0.';
      add('Barres longitudinales', p.diametre, Math.max(0, Math.floor(p.nbBarresLong)), l);
      const lc = longueurCadre(d1, d2);
      if (lc <= 0) erreur = "L'enrobage est trop grand pour cette section.";
      add('Cadres', p.diametreCadre, nbRepartition(l, st), lc);
      break;
    }
  }

  const k = 1 + p.marge / 100;
  const map = new Map<Diametre, LigneDiametre>();
  for (const g of groupes) {
    const cur = map.get(g.diametre) ?? {
      diametre: g.diametre, nombre: 0, longueurNette: 0, longueur: 0, poids: 0, barres12m: 0,
    };
    cur.nombre += g.nombre;
    cur.longueurNette += g.longueur;
    map.set(g.diametre, cur);
  }
  const parDiametre = DIAMETRES.filter((d) => map.has(d)).map((d) => {
    const l = map.get(d)!;
    l.longueur = l.longueurNette * k;
    l.poids = l.longueur * POIDS_LINEIQUE[d];
    l.barres12m = Math.ceil(l.longueur / LONGUEUR_COMMERCIALE - 1e-9);
    return l;
  });

  return {
    groupes,
    parDiametre,
    nombreBarres: groupes.reduce((a, g) => a + g.nombre, 0),
    longueurNette: parDiametre.reduce((a, l) => a + l.longueurNette, 0),
    longueurTotale: parDiametre.reduce((a, l) => a + l.longueur, 0),
    poidsTotal: parDiametre.reduce((a, l) => a + l.poids, 0),
    barres12m: parDiametre.reduce((a, l) => a + l.barres12m, 0),
    erreur,
  };
}
