/** Convertit une saisie (virgule ou point) en nombre. Retourne 0 si invalide. */
export function parseNum(value: string | number | undefined | null): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const n = parseFloat(String(value).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/** Formate un nombre à la française : 1 234,56 */
export function fmt(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '0';
  const fixed = value.toFixed(decimals);
  const [int, dec] = fixed.split('.');
  const intSpaced = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return dec ? `${intSpaced},${dec}` : intSpaced;
}

export function fmtMoney(value: number, currency: string): string {
  return `${fmt(value, 2)} ${currency}`;
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---- Dates (stockées au format AAAA-MM-JJ) ----

export function todayISO(): string {
  return toISODate(new Date());
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map((x) => parseInt(x, 10));
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

export function fmtDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function addDays(iso: string, days: number): string {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Nombre de jours entre deux dates ISO (b - a). */
export function diffDays(a: string, b: string): number {
  const ms = fromISODate(b).getTime() - fromISODate(a).getTime();
  return Math.round(ms / 86400000);
}

export const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];
export const DAYS_FR_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
