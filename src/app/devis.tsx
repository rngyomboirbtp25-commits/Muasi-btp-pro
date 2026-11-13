import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DateField } from '../components/DateField';
import {
  BigButton,
  Card,
  Choice,
  Field,
  Hint,
  ResultRow,
  Row,
  Screen,
  SectionLabel,
} from '../components/ui';
import {
  UNITES,
  exporterDevisPDF,
  ligneDepuisImport,
  nouvelleLigne,
  totalLigne,
  totauxDevis,
  type Devis,
  type LigneDevis,
} from '../lib/devis';
import { fmtDate, fmtMoney, todayISO, uid } from '../lib/format';
import { confirm, notify } from '../lib/notify';
import { usePersistentState } from '../lib/storage';
import { useStore, type CalcExport } from '../lib/store';
import { colors, sizes } from '../lib/theme';

const MONNAIES = ['€', '$', 'FC', 'FCFA', 'DH', 'DA'];
const TAUX_TVA = ['0', '16', '18', '20'];

function prochainNumero(liste: Devis[]): string {
  const annee = new Date().getFullYear();
  const prefix = `${annee}-`;
  const max = liste
    .filter((d) => d.numero.startsWith(prefix))
    .map((d) => parseInt(d.numero.slice(prefix.length), 10) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

export default function DevisScreen() {
  const [liste, setListe] = usePersistentState<Devis[]>('devis', []);
  const [editId, setEditId] = useState<string | null>(null);
  const { settings, setSettings } = useStore();
  const cur = settings.currency;

  const courant = liste.find((d) => d.id === editId) ?? null;

  const creer = () => {
    const d: Devis = {
      id: uid(),
      numero: prochainNumero(liste),
      client: '',
      projet: '',
      date: todayISO(),
      tva: '18',
      lignes: [],
      notes: '',
    };
    setListe([d, ...liste]);
    setEditId(d.id);
  };

  if (courant) {
    return (
      <DevisEditor
        devis={courant}
        currency={cur}
        onChange={(d) => setListe(liste.map((x) => (x.id === d.id ? d : x)))}
        onBack={() => setEditId(null)}
        onDelete={() =>
          confirm('Supprimer ce devis ?', `Devis N° ${courant.numero} — action définitive.`, () => {
            setListe(liste.filter((x) => x.id !== courant.id));
            setEditId(null);
          })
        }
        onDuplicate={() => {
          const copie: Devis = {
            ...courant,
            id: uid(),
            numero: prochainNumero(liste),
            date: todayISO(),
            lignes: courant.lignes.map((l) => ({ ...l, id: uid() })),
          };
          setListe([copie, ...liste]);
          setEditId(copie.id);
        }}
      />
    );
  }

  return (
    <Screen>
      <BigButton label="➕ Nouveau devis" onPress={creer} />

      {liste.length === 0 ? (
        <Card>
          <Text style={styles.empty}>Aucun devis pour l'instant.</Text>
          <Hint>Créez un devis, puis importez les résultats du calculateur de béton ou du ferraillage.</Hint>
        </Card>
      ) : (
        liste.map((d) => {
          const t = totauxDevis(d);
          return (
            <Pressable
              key={d.id}
              onPress={() => setEditId(d.id)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>N° {d.numero} · {fmtDate(d.date)}</Text>
                <Text style={styles.itemSub} numberOfLines={1}>
                  {d.client || 'Client ?'} — {d.projet || 'Projet ?'}
                </Text>
                <Text style={styles.itemSub}>{d.lignes.length} ligne(s)</Text>
              </View>
              <Text style={styles.itemTotal}>{fmtMoney(t.total, cur)}</Text>
            </Pressable>
          );
        })
      )}

      <Card title="Monnaie">
        <Choice
          options={MONNAIES.map((m) => ({ value: m, label: m }))}
          value={MONNAIES.includes(cur) ? cur : ''}
          onChange={(m) => setSettings({ ...settings, currency: m })}
          columns={3}
        />
        <Field
          label="Autre monnaie"
          value={cur}
          onChangeText={(t) => setSettings({ ...settings, currency: t })}
          keyboardType="default"
        />
        <Hint>Utilisée dans tous les modules (béton, ferraillage, devis).</Hint>
      </Card>
    </Screen>
  );
}

function DevisEditor({
  devis: d,
  currency,
  onChange,
  onBack,
  onDelete,
  onDuplicate,
}: {
  devis: Devis;
  currency: string;
  onChange: (d: Devis) => void;
  onBack: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const { betonExport, ferExport } = useStore();
  const [busy, setBusy] = useState(false);
  const t = totauxDevis(d);

  const set = <K extends keyof Devis>(k: K, v: Devis[K]) => onChange({ ...d, [k]: v });
  const setLigne = (id: string, patch: Partial<LigneDevis>) =>
    set('lignes', d.lignes.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const supprimerLigne = (id: string) => set('lignes', d.lignes.filter((l) => l.id !== id));
  const deplacer = (index: number, delta: number) => {
    const j = index + delta;
    if (j < 0 || j >= d.lignes.length) return;
    const next = [...d.lignes];
    [next[index], next[j]] = [next[j], next[index]];
    set('lignes', next);
  };

  const importer = (exp: CalcExport | null, nom: string) => {
    if (!exp) {
      notify('Rien à importer', `Faites un calcul dans l'onglet ${nom} puis touchez « Envoyer au devis ».`);
      return;
    }
    set('lignes', [...d.lignes, ...exp.lignes.map(ligneDepuisImport)]);
    notify('Import réussi', `${exp.lignes.length} ligne(s) ajoutée(s) :\n${exp.titre}`);
  };

  const exporter = async () => {
    setBusy(true);
    try {
      await exporterDevisPDF(d, currency);
    } catch (e) {
      notify('Export impossible', String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <BigButton label="← Liste des devis" onPress={onBack} variant="outline" />

      <Card title={`Devis N° ${d.numero}`}>
        <Field label="Nom du client" value={d.client} onChangeText={(v) => set('client', v)} keyboardType="default" placeholder="Ex. M. Kabeya" />
        <Field label="Nom du projet" value={d.projet} onChangeText={(v) => set('projet', v)} keyboardType="default" placeholder="Ex. Villa R+1 Gombe" />
        <DateField label="Date" value={d.date} onChange={(v) => set('date', v)} />
      </Card>

      <Card title="Importer un calcul">
        <BigButton
          label="🧱 Importer béton"
          onPress={() => importer(betonExport, 'Béton')}
          variant="dark"
          disabled={!betonExport}
        />
        <Hint>{betonExport ? `Dernier calcul : ${betonExport.titre}` : 'Aucun calcul béton envoyé.'}</Hint>
        <BigButton
          label="🔩 Importer ferraillage"
          onPress={() => importer(ferExport, 'Ferraillage')}
          variant="dark"
          disabled={!ferExport}
        />
        <Hint>{ferExport ? `Dernier calcul : ${ferExport.titre}` : 'Aucun calcul de ferraillage envoyé.'}</Hint>
      </Card>

      <Text style={styles.h2}>Lignes du devis ({d.lignes.length})</Text>
      {d.lignes.map((l, i) => (
        <Card key={l.id} style={{ gap: 10 }}>
          <View style={styles.lineHead}>
            <Text style={styles.lineNum}>Ligne {i + 1}</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <BigButton small label="▲" variant="outline" onPress={() => deplacer(i, -1)} disabled={i === 0} />
              <BigButton small label="▼" variant="outline" onPress={() => deplacer(i, 1)} disabled={i === d.lignes.length - 1} />
              <BigButton small label="✕" variant="danger" onPress={() => supprimerLigne(l.id)} />
            </View>
          </View>
          <Field
            label="Désignation"
            value={l.designation}
            onChangeText={(v) => setLigne(l.id, { designation: v })}
            keyboardType="default"
            placeholder="Ex. Fouilles en rigole"
          />
          <Row>
            <Field label="Quantité" value={l.quantite} onChangeText={(v) => setLigne(l.id, { quantite: v })} />
            <Field label="Prix unitaire" value={l.prixUnitaire} onChangeText={(v) => setLigne(l.id, { prixUnitaire: v })} suffix={currency} />
          </Row>
          <SectionLabel>Unité</SectionLabel>
          <Choice
            options={(UNITES.includes(l.unite) ? UNITES : [...UNITES, l.unite]).map((u) => ({ value: u, label: u }))}
            value={l.unite}
            onChange={(u) => setLigne(l.id, { unite: u })}
          />
          <ResultRow label="Montant" value={fmtMoney(totalLigne(l), currency)} />
        </Card>
      ))}
      <BigButton label="➕ Ajouter une ligne" onPress={() => set('lignes', [...d.lignes, nouvelleLigne()])} />

      <Card title="TVA et total">
        <SectionLabel>Taux de TVA</SectionLabel>
        <Choice
          options={TAUX_TVA.map((v) => ({ value: v, label: `${v} %` }))}
          value={d.tva}
          onChange={(v) => set('tva', v)}
          columns={4}
        />
        <Field label="Autre taux" value={d.tva} onChangeText={(v) => set('tva', v)} suffix="%" />
        <ResultRow label="Sous-total HT" value={fmtMoney(t.sousTotal, currency)} />
        <ResultRow label={`TVA (${t.tauxTva} %)`} value={fmtMoney(t.tva, currency)} />
        <ResultRow label="TOTAL TTC" value={fmtMoney(t.total, currency)} strong />
      </Card>

      <Card title="Notes / conditions">
        <Field
          label="Texte libre (délais, validité, acompte…)"
          value={d.notes}
          onChangeText={(v) => set('notes', v)}
          keyboardType="default"
          multiline
        />
      </Card>

      <BigButton
        label={busy ? 'Génération du PDF…' : '📄 Exporter en PDF et partager'}
        onPress={exporter}
        variant="success"
        disabled={busy}
      />
      <Row>
        <BigButton label="Dupliquer" onPress={onDuplicate} variant="outline" style={{ flex: 1 }} />
        <BigButton label="Supprimer" onPress={onDelete} variant="danger" style={{ flex: 1 }} />
      </Row>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { fontSize: 20, fontWeight: '800', color: colors.text },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: sizes.radius,
    padding: 14,
    minHeight: 80,
  },
  itemTitle: { fontSize: 19, fontWeight: '900', color: colors.text },
  itemSub: { fontSize: 16, color: colors.textMuted, marginTop: 2 },
  itemTotal: { fontSize: 19, fontWeight: '900', color: colors.text },
  h2: { fontSize: 22, fontWeight: '900', color: colors.text, marginTop: 6 },
  lineHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lineNum: { fontSize: 18, fontWeight: '900', color: colors.text },
});
