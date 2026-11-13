import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DateField } from '../components/DateField';
import {
  BigButton,
  Card,
  Choice,
  Field,
  Hint,
  ProgressBar,
  Row,
  Screen,
  SectionLabel,
} from '../components/ui';
import { addDays, diffDays, fmtDate, fromISODate, parseNum, todayISO, uid } from '../lib/format';
import { confirm, notify } from '../lib/notify';
import { usePersistentState } from '../lib/storage';
import { colors, sizes } from '../lib/theme';

type Statut = 'a_faire' | 'en_cours' | 'termine';

type Tache = {
  id: string;
  nom: string;
  debut: string; // AAAA-MM-JJ
  duree: string; // jours (texte saisi)
  statut: Statut;
};

type PlanningState = { chantier: string; taches: Tache[] };

const STATUTS: { value: Statut; label: string }[] = [
  { value: 'a_faire', label: 'À faire' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'termine', label: 'Terminé' },
];

const STATUT_COULEUR: Record<Statut, { bg: string; fg: string }> = {
  a_faire: { bg: '#9E9E9E', fg: '#111111' },
  en_cours: { bg: colors.primary, fg: '#111111' },
  termine: { bg: colors.success, fg: '#FFFFFF' },
};

const STATUT_LABEL: Record<Statut, string> = {
  a_faire: 'À faire',
  en_cours: 'En cours',
  termine: 'Terminé',
};

/** Avancement d'une tâche : à faire 0 %, en cours 50 %, terminé 100 %. */
const AVANCEMENT: Record<Statut, number> = { a_faire: 0, en_cours: 0.5, termine: 1 };

const dureeJours = (t: Tache) => Math.max(1, Math.round(parseNum(t.duree)) || 1);
const finTache = (t: Tache) => addDays(t.debut, dureeJours(t) - 1);

function brouillon(debut = todayISO()): Tache {
  return { id: '', nom: '', debut, duree: '1', statut: 'a_faire' };
}

export default function PlanningScreen() {
  const [s, setS] = usePersistentState<PlanningState>('planning', { chantier: '', taches: [] });
  const [vue, setVue] = useState<'liste' | 'chrono'>('liste');
  const [form, setForm] = useState<Tache | null>(null);

  const taches = useMemo(
    () => [...s.taches].sort((a, b) => a.debut.localeCompare(b.debut) || a.nom.localeCompare(b.nom)),
    [s.taches],
  );

  const stats = useMemo(() => {
    const totalJours = taches.reduce((a, t) => a + dureeJours(t), 0);
    const fait = taches.reduce((a, t) => a + dureeJours(t) * AVANCEMENT[t.statut], 0);
    const count = (st: Statut) => taches.filter((t) => t.statut === st).length;
    const debut = taches.length ? taches[0].debut : null;
    const fin = taches.length ? taches.map(finTache).sort().at(-1)! : null;
    return {
      pct: totalJours ? (fait / totalJours) * 100 : 0,
      aFaire: count('a_faire'),
      enCours: count('en_cours'),
      termine: count('termine'),
      debut,
      fin,
    };
  }, [taches]);

  const enregistrer = () => {
    if (!form) return;
    if (!form.nom.trim()) {
      notify('Nom manquant', 'Donnez un nom à la tâche.');
      return;
    }
    const t = { ...form, nom: form.nom.trim(), duree: String(dureeJours(form)) };
    if (t.id) {
      setS({ ...s, taches: s.taches.map((x) => (x.id === t.id ? t : x)) });
    } else {
      setS({ ...s, taches: [...s.taches, { ...t, id: uid() }] });
    }
    setForm(null);
  };

  const setStatut = (id: string, statut: Statut) =>
    setS({ ...s, taches: s.taches.map((t) => (t.id === id ? { ...t, statut } : t)) });

  const supprimer = (t: Tache) =>
    confirm('Supprimer la tâche ?', t.nom, () => {
      setS({ ...s, taches: s.taches.filter((x) => x.id !== t.id) });
      setForm(null);
    });

  return (
    <Screen>
      <Card title="Avancement du chantier">
        <Field
          label="Nom du chantier"
          value={s.chantier}
          onChangeText={(chantier) => setS({ ...s, chantier })}
          keyboardType="default"
          placeholder="Ex. Immeuble R+3 Limete"
        />
        <View style={styles.pctRow}>
          <Text style={styles.pct}>{Math.round(stats.pct)} %</Text>
          <Text style={styles.pctSub}>
            {stats.termine} terminée(s) · {stats.enCours} en cours · {stats.aFaire} à faire
          </Text>
        </View>
        <ProgressBar value={stats.pct} />
        {stats.debut && stats.fin ? (
          <Hint>
            Du {fmtDate(stats.debut)} au {fmtDate(stats.fin)} ({diffDays(stats.debut, stats.fin) + 1} jours)
            {' '}— avancement pondéré par la durée (en cours = 50 %).
          </Hint>
        ) : null}
      </Card>

      {form ? (
        <Card title={form.id ? 'Modifier la tâche' : 'Nouvelle tâche'} style={{ borderColor: colors.primary, borderWidth: 4 }}>
          <Field
            label="Nom de la tâche"
            value={form.nom}
            onChangeText={(nom) => setForm({ ...form, nom })}
            keyboardType="default"
            placeholder="Ex. Coulage dalle RDC"
          />
          <Row>
            <DateField label="Date de début" value={form.debut} onChange={(debut) => setForm({ ...form, debut })} />
            <Field
              label="Durée"
              value={form.duree}
              onChangeText={(duree) => setForm({ ...form, duree })}
              keyboardType="number-pad"
              suffix="j"
            />
          </Row>
          <Hint>Fin prévue : {fmtDate(finTache(form))}</Hint>
          <SectionLabel>Statut</SectionLabel>
          <Choice options={STATUTS} value={form.statut} onChange={(statut) => setForm({ ...form, statut })} columns={3} />
          <Row>
            <BigButton label="Annuler" variant="outline" onPress={() => setForm(null)} style={{ flex: 1 }} />
            <BigButton label="Enregistrer" variant="success" onPress={enregistrer} style={{ flex: 1 }} />
          </Row>
          {form.id ? <BigButton label="Supprimer la tâche" variant="danger" onPress={() => supprimer(form)} /> : null}
        </Card>
      ) : (
        <BigButton
          label="➕ Ajouter une tâche"
          onPress={() => setForm(brouillon(taches.length ? finTache(taches[taches.length - 1]) : todayISO()))}
        />
      )}

      <Choice
        options={[
          { value: 'liste', label: '☰ Liste' },
          { value: 'chrono', label: '▤ Chronologie' },
        ]}
        value={vue}
        onChange={setVue}
        columns={2}
      />

      {taches.length === 0 ? (
        <Card>
          <Text style={styles.empty}>Aucune tâche.</Text>
          <Hint>Ajoutez les étapes du chantier : implantation, fouilles, fondations, élévation, dalle…</Hint>
        </Card>
      ) : vue === 'liste' ? (
        taches.map((t) => (
          <Card key={t.id} style={[styles.task, { borderLeftColor: STATUT_COULEUR[t.statut].bg }]}>
            <View style={{ gap: 2 }}>
              <Text style={[styles.taskName, t.statut === 'termine' && styles.done]}>{t.nom}</Text>
              <Text style={styles.taskDates}>
                {fmtDate(t.debut)} → {fmtDate(finTache(t))} · {dureeJours(t)} j
              </Text>
            </View>
            <Choice options={STATUTS} value={t.statut} onChange={(st) => setStatut(t.id, st)} columns={3} />
            <BigButton small label="✎ Modifier" variant="outline" onPress={() => setForm({ ...t })} />
          </Card>
        ))
      ) : (
        <Chronologie taches={taches} onPress={(t) => setForm({ ...t })} />
      )}
    </Screen>
  );
}

const JOUR_PX = 30;
const MOIS_COURT = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];
const NOM_PX = 120;

function Chronologie({ taches, onPress }: { taches: Tache[]; onPress: (t: Tache) => void }) {
  const debut = taches[0].debut;
  const fin = taches.map(finTache).sort().at(-1)!;
  const nbJours = diffDays(debut, fin) + 1;
  const today = todayISO();
  const offToday = diffDays(debut, today);
  const jours = Array.from({ length: nbJours }, (_, i) => addDays(debut, i));

  return (
    <Card title="Chronologie">
      <Hint>Touchez une barre pour modifier la tâche. Faites glisser horizontalement.</Hint>
      <View style={{ flexDirection: 'row' }}>
        {/* Colonne fixe des noms */}
        <View style={{ width: NOM_PX }}>
          <View style={styles.headCell} />
          {taches.map((t) => (
            <View key={t.id} style={styles.nameCell}>
              <Text style={styles.nameText} numberOfLines={2}>
                {t.nom}
              </Text>
            </View>
          ))}
        </View>
        <ScrollView horizontal style={{ flex: 1 }}>
          <View style={{ width: nbJours * JOUR_PX }}>
            <View style={[styles.headCell, { flexDirection: 'row' }]}>
              {jours.map((j) => {
                const d = fromISODate(j);
                const lundi = d.getDay() === 1 || j === debut;
                return (
                  <View key={j} style={[styles.dayHead, lundi && styles.dayHeadMonday]}>
                    <Text style={styles.dayHeadText}>{d.getDate()}</Text>
                    {lundi || d.getDate() === 1 ? (
                      <Text style={styles.dayHeadMonth}>{MOIS_COURT[d.getMonth()]}</Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
            {taches.map((t) => {
              const left = diffDays(debut, t.debut) * JOUR_PX;
              const width = dureeJours(t) * JOUR_PX - 4;
              const c = STATUT_COULEUR[t.statut];
              return (
                <View key={t.id} style={styles.barRow}>
                  <Text
                    onPress={() => onPress(t)}
                    accessibilityRole="button"
                    accessibilityLabel={`${t.nom}, ${STATUT_LABEL[t.statut]}`}
                    numberOfLines={1}
                    style={[styles.bar, { left: left + 2, width, backgroundColor: c.bg, color: c.fg }]}
                  >
                    {dureeJours(t)} j
                  </Text>
                </View>
              );
            })}
            {offToday >= 0 && offToday < nbJours ? (
              <View pointerEvents="none" style={[styles.todayLine, { left: offToday * JOUR_PX + JOUR_PX / 2 }]} />
            ) : null}
          </View>
        </ScrollView>
      </View>
      <View style={styles.legend}>
        {STATUTS.map((st) => (
          <View key={st.value} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: STATUT_COULEUR[st.value].bg }]} />
            <Text style={styles.legendText}>{st.label}</Text>
          </View>
        ))}
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.danger, width: 4 }]} />
          <Text style={styles.legendText}>Aujourd'hui</Text>
        </View>
      </View>
    </Card>
  );
}

const ROW_H = 52;

const styles = StyleSheet.create({
  pctRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' },
  pct: { fontSize: 44, fontWeight: '900', color: colors.text },
  pctSub: { fontSize: sizes.fontSmall, fontWeight: '700', color: colors.textMuted, flexShrink: 1 },
  empty: { fontSize: 20, fontWeight: '800', color: colors.text },
  task: { borderLeftWidth: 10, gap: 10 },
  taskName: { fontSize: 20, fontWeight: '900', color: colors.text },
  done: { textDecorationLine: 'line-through', color: colors.textMuted },
  taskDates: { fontSize: 16, fontWeight: '600', color: colors.textMuted },
  headCell: { height: 40, borderBottomWidth: 2, borderBottomColor: colors.border },
  nameCell: {
    height: ROW_H,
    justifyContent: 'center',
    paddingRight: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#DDDDDD',
  },
  nameText: { fontSize: 14, fontWeight: '800', color: colors.text },
  dayHead: {
    width: JOUR_PX,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#EEEEEE',
  },
  dayHeadMonday: { borderLeftColor: colors.border, borderLeftWidth: 2 },
  dayHeadText: { fontSize: 13, fontWeight: '800', color: colors.text },
  dayHeadMonth: { fontSize: 9, fontWeight: '700', color: colors.textMuted },
  barRow: { height: ROW_H, borderBottomWidth: 1, borderBottomColor: '#DDDDDD', justifyContent: 'center' },
  bar: {
    position: 'absolute',
    height: 34,
    lineHeight: 34,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    overflow: 'hidden',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  todayLine: { position: 'absolute', top: 40, bottom: 0, width: 3, backgroundColor: colors.danger },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: colors.border },
  legendText: { fontSize: 15, fontWeight: '700', color: colors.text },
});
