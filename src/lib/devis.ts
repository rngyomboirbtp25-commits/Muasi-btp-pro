import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { fmt, fmtDate, fmtMoney, parseNum, uid } from './format';
import type { ImportLine } from './store';

export type LigneDevis = {
  id: string;
  designation: string;
  quantite: string; // texte saisi (accepte la virgule)
  unite: string;
  prixUnitaire: string;
};

export type Devis = {
  id: string;
  numero: string;
  client: string;
  projet: string;
  date: string; // AAAA-MM-JJ
  tva: string; // taux en %
  lignes: LigneDevis[];
  notes: string;
};

export const UNITES = ['u', 'm', 'm²', 'm³', 'kg', 't', 'sac', 'h', 'j', 'forfait'];

export function nouvelleLigne(partial?: Partial<LigneDevis>): LigneDevis {
  return { id: uid(), designation: '', quantite: '1', unite: 'u', prixUnitaire: '0', ...partial };
}

export function ligneDepuisImport(l: ImportLine): LigneDevis {
  return nouvelleLigne({
    designation: l.designation,
    quantite: fmtPlain(l.quantite),
    unite: l.unite,
    prixUnitaire: fmtPlain(l.prixUnitaire),
  });
}

function fmtPlain(n: number): string {
  return String(Math.round(n * 1000) / 1000).replace('.', ',');
}

export function totalLigne(l: LigneDevis): number {
  return parseNum(l.quantite) * parseNum(l.prixUnitaire);
}

export function totauxDevis(d: Devis) {
  const sousTotal = d.lignes.reduce((a, l) => a + totalLigne(l), 0);
  const tauxTva = parseNum(d.tva);
  const tva = (sousTotal * tauxTva) / 100;
  return { sousTotal, tauxTva, tva, total: sousTotal + tva };
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function devisHTML(d: Devis, currency: string): string {
  const t = totauxDevis(d);
  const rows = d.lignes
    .map(
      (l, i) => `<tr>
        <td class="c">${i + 1}</td>
        <td>${esc(l.designation || '—')}</td>
        <td class="r">${fmt(parseNum(l.quantite), 2)}</td>
        <td class="c">${esc(l.unite)}</td>
        <td class="r">${fmtMoney(parseNum(l.prixUnitaire), esc(currency))}</td>
        <td class="r">${fmtMoney(totalLigne(l), esc(currency))}</td>
      </tr>`,
    )
    .join('');
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; color: #111; padding: 28px; font-size: 13px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 4px solid #FFC400; padding-bottom: 12px; }
  .brand { font-size: 26px; font-weight: 900; }
  .brand span { background: #1B1B1B; color: #FFC400; padding: 2px 8px; border-radius: 4px; }
  h1 { font-size: 22px; margin: 0; text-align: right; }
  .meta { text-align: right; color: #333; margin-top: 4px; }
  .box { margin-top: 18px; display: flex; gap: 16px; }
  .box div { flex: 1; border: 2px solid #1B1B1B; border-radius: 6px; padding: 10px; }
  .box b { display: block; font-size: 11px; text-transform: uppercase; color: #555; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th { background: #1B1B1B; color: #FFC400; padding: 8px 6px; text-align: left; font-size: 12px; }
  td { padding: 7px 6px; border-bottom: 1px solid #CCC; vertical-align: top; }
  tr:nth-child(even) td { background: #F6F6F6; }
  .r { text-align: right; white-space: nowrap; }
  .c { text-align: center; }
  .totals { margin-top: 16px; margin-left: auto; width: 55%; }
  .totals td { border: none; padding: 6px; font-size: 14px; }
  .totals tr.grand td { background: #1B1B1B; color: #FFC400; font-size: 17px; font-weight: 900; }
  .notes { margin-top: 24px; white-space: pre-wrap; border-left: 4px solid #FFC400; padding-left: 10px; }
  .foot { margin-top: 40px; display: flex; justify-content: space-between; color: #333; }
  .sign { width: 45%; border-top: 1px solid #111; padding-top: 6px; height: 70px; }
</style></head>
<body>
  <div class="head">
    <div class="brand"><span>Chantier</span>Pro</div>
    <div>
      <h1>DEVIS N° ${esc(d.numero)}</h1>
      <div class="meta">Date : ${fmtDate(d.date)}</div>
    </div>
  </div>
  <div class="box">
    <div><b>Client</b>${esc(d.client || '—')}</div>
    <div><b>Projet</b>${esc(d.projet || '—')}</div>
  </div>
  <table>
    <thead><tr>
      <th class="c">#</th><th>Désignation</th><th class="r">Qté</th><th class="c">Unité</th>
      <th class="r">P.U.</th><th class="r">Montant</th>
    </tr></thead>
    <tbody>${rows || '<tr><td colspan="6" class="c">Aucune ligne</td></tr>'}</tbody>
  </table>
  <table class="totals">
    <tr><td>Sous-total HT</td><td class="r">${fmtMoney(t.sousTotal, esc(currency))}</td></tr>
    <tr><td>TVA (${fmt(t.tauxTva, 2)} %)</td><td class="r">${fmtMoney(t.tva, esc(currency))}</td></tr>
    <tr class="grand"><td>TOTAL TTC</td><td class="r">${fmtMoney(t.total, esc(currency))}</td></tr>
  </table>
  ${d.notes ? `<div class="notes">${esc(d.notes)}</div>` : ''}
  <div class="foot">
    <div class="sign">Signature de l'entreprise</div>
    <div class="sign">Bon pour accord — signature du client</div>
  </div>
</body></html>`;
}

/** Génère le PDF du devis puis ouvre la feuille de partage du téléphone. */
export async function exporterDevisPDF(d: Devis, currency: string): Promise<void> {
  const html = devisHTML(d, currency);
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: `Devis ${d.numero}`,
    });
  } else {
    await Print.printAsync({ uri });
  }
}
