import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Text } from 'react-native';
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
  Stepper,
} from '../components/ui';
import {
  AVEC_CADRES,
  DIAMETRES,
  DIMENSIONS_FER,
  ELEMENTS_FER,
  POIDS_LINEIQUE,
  calculFerraillage,
  type Diametre,
  type ElementFer,
} from '../lib/ferraillage';
import { fmt, fmtMoney, parseNum, round } from '../lib/format';
import { notify } from '../lib/notify';
import { usePersistentState } from '../lib/storage';
import { useStore } from '../lib/store';
import { colors } from '../lib/theme';

type FerState = {
  element: ElementFer;
  dims: Record<ElementFer, [string, string, string]>;
  nombre: string;
  diametre: Diametre;
  espacement: string;
  enrobage: string;
  doubleNappe: boolean;
  nbBarresLong: string;
  diametreCadre: Diametre;
  espacementCadres: string;
  marge: number;
  prixKg: string;
};

const INITIAL: FerState = {
  element: 'dalle',
  dims: {
    dalle: ['5', '4', '0,15'],
    semelle: ['1', '1', '0,4'],
    mur: ['6', '2,5', '0,2'],
    poteau: ['0,2', '0,2', '3'],
    poutre: ['0,2', '0,4', '5'],
  },
  nombre: '1',
  diametre: 'HA10',
  espacement: '15',
  enrobage: '3',
  doubleNappe: false,
  nbBarresLong: '4',
  diametreCadre: 'HA6',
  espacementCadres: '15',
  marge: 5,
  prixKg: '1,5',
};

const NOMS: Record<ElementFer, string> = {
  dalle: 'dalle', poteau: 'poteau', semelle: 'semelle', poutre: 'poutre', mur: 'mur',
};

const DIAM_OPTIONS = DIAMETRES.map((d) => ({ value: d, label: d }));

export default function FerraillageScreen() {
  const [s, setS] = usePersistentState<FerState>('ferraillage', INITIAL);
  const { settings, setFerExport } = useStore();
  const router = useRouter();
  const cur = settings.currency;

  const dimsText = s.dims[s.element];
  const labels = DIMENSIONS_FER[s.element];
  const cadres = AVEC_CADRES[s.element];
  const prixKg = parseNum(s.prixKg);

  const r = useMemo(
    () =>
      calculFerraillage({
        element: s.element,
        dims: dimsText.map(parseNum) as [number, number, number],
        nombre: parseNum(s.nombre),
        diametre: s.diametre,
        espacement: parseNum(s.espacement),
        enrobage: parseNum(s.enrobage),
        doubleNappe: s.doubleNappe,
        nbBarresLong: parseNum(s.nbBarresLong),
        diametreCadre: s.diametreCadre,
        espacementCadres: parseNum(s.espacementCadres),
        marge: s.marge,
      }),
    [s, dimsText],
  );

  const set = <K extends keyof FerState>(k: K, v: FerState[K]) => setS({ ...s, [k]: v });
  const setDim = (i: number, t: string) => {
    const next = [...dimsText] as [string, string, string];
    next[i] = t;
    setS({ ...s, dims: { ...s.dims, [s.element]: next } });
  };

  const envoyerAuDevis = () => {
    if (r.poidsTotal <= 0) {
      notify('Calcul vide', 'Vérifiez les dimensions et les espacements.');
      return;
    }
    setFerExport({
      titre: `Ferraillage ${NOMS[s.element]} ${dimsText.join(' × ')} m × ${s.nombre} — ${fmt(r.poidsTotal, 1)} kg`,
      date: new Date().toISOString(),
      lignes: r.parDiametre.map((l) => ({
        designation: `Acier ${l.diametre} — ${NOMS[s.element]} (${l.barres12m} barres de 12 m)`,
        quantite: round(l.poids, 2),
        unite: 'kg',
        prixUnitaire: prixKg,
      })),
    });
    router.navigate('/devis');
    notify('Prêt pour le devis', 'Ouvrez un devis puis touchez « Importer ferraillage ».');
  };

  return (
    <Screen>
      <Card title="1. Élément">
        <Choice options={ELEMENTS_FER} value={s.element} onChange={(v) => set('element', v)} columns={3} />
      </Card>

      <Card title="2. Dimensions (m)">
        <Row>
          <Field label={labels[0]} value={dimsText[0]} onChangeText={(t) => setDim(0, t)} suffix="m" />
          <Field label={labels[1]} value={dimsText[1]} onChangeText={(t) => setDim(1, t)} suffix="m" />
        </Row>
        <Row>
          <Field label={labels[2]} value={dimsText[2]} onChangeText={(t) => setDim(2, t)} suffix="m" />
          <Field
            label="Nombre d'éléments"
            value={s.nombre}
            onChangeText={(t) => set('nombre', t)}
            keyboardType="number-pad"
          />
        </Row>
        {s.element === 'poteau' || s.element === 'poutre' ? (
          <Hint>
            {s.element === 'poteau'
              ? 'Section a × b, hauteur du poteau.'
              : 'Section b × h, longueur de la poutre.'}
          </Hint>
        ) : null}
      </Card>

      <Card title={cadres ? '3. Barres longitudinales' : '3. Armatures'}>
        <SectionLabel>Diamètre des barres</SectionLabel>
        <Choice options={DIAM_OPTIONS} value={s.diametre} onChange={(v) => set('diametre', v)} columns={4} />
        <Row>
          {cadres ? (
            <Field
              label="Nombre de barres"
              value={s.nbBarresLong}
              onChangeText={(t) => set('nbBarresLong', t)}
              keyboardType="number-pad"
            />
          ) : (
            <Field label="Espacement" value={s.espacement} onChangeText={(t) => set('espacement', t)} suffix="cm" />
          )}
          <Field label="Enrobage" value={s.enrobage} onChangeText={(t) => set('enrobage', t)} suffix="cm" />
        </Row>
        {s.element === 'dalle' || s.element === 'mur' ? (
          <>
            <SectionLabel>{s.element === 'dalle' ? 'Nappes' : 'Faces armées'}</SectionLabel>
            <Choice
              options={[
                { value: 'simple', label: s.element === 'dalle' ? '1 nappe' : '1 face' },
                { value: 'double', label: s.element === 'dalle' ? '2 nappes' : '2 faces' },
              ]}
              value={s.doubleNappe ? 'double' : 'simple'}
              onChange={(v) => set('doubleNappe', v === 'double')}
              columns={2}
            />
          </>
        ) : null}
      </Card>

      {cadres ? (
        <Card title="4. Cadres (armatures transversales)">
          <SectionLabel>Diamètre des cadres</SectionLabel>
          <Choice
            options={DIAM_OPTIONS}
            value={s.diametreCadre}
            onChange={(v) => set('diametreCadre', v)}
            columns={4}
          />
          <Field
            label="Espacement des cadres"
            value={s.espacementCadres}
            onChangeText={(t) => set('espacementCadres', t)}
            suffix="cm"
          />
          <Hint>Longueur d'un cadre = périmètre intérieur (section − 2 × enrobage) + 2 crochets de 10 Ø.</Hint>
        </Card>
      ) : null}

      <Card>
        <Stepper
          label="Marge de chute"
          value={s.marge}
          onChange={(v) => set('marge', v)}
          min={5}
          max={10}
          suffix=" %"
        />
      </Card>

      <Card title="Résultats">
        {r.erreur ? <Text style={{ color: colors.danger, fontSize: 17, fontWeight: '800' }}>⚠ {r.erreur}</Text> : null}
        {r.groupes.map((g) => (
          <ResultRow
            key={g.role}
            label={`${g.role} ${g.diametre}`}
            value={`${g.nombre} × ${fmt(g.longueurUnitaire, 2)} m`}
          />
        ))}
        <ResultRow label="Nombre de barres" value={`${r.nombreBarres}`} />
        <ResultRow label="Longueur nette" value={`${fmt(r.longueurNette, 2)} m`} />
        <ResultRow label={`Longueur totale (+${s.marge} % chute)`} value={`${fmt(r.longueurTotale, 2)} m`} />
        <ResultRow label="Poids total" value={`${fmt(r.poidsTotal, 1)} kg`} strong />
        <ResultRow label="Barres de 12 m à commander" value={`${r.barres12m}`} strong />
      </Card>

      {r.parDiametre.length > 1 ? (
        <Card title="Détail par diamètre">
          {r.parDiametre.map((l) => (
            <ResultRow
              key={l.diametre}
              label={`${l.diametre} · ${fmt(l.longueur, 1)} m · ${fmt(l.poids, 1)} kg`}
              value={`${l.barres12m} × 12 m`}
            />
          ))}
        </Card>
      ) : null}

      <Card title={`Coût estimé (${cur})`}>
        <Field label="Prix de l'acier (par kg)" value={s.prixKg} onChangeText={(t) => set('prixKg', t)} suffix={cur} />
        <ResultRow label="TOTAL acier" value={fmtMoney(r.poidsTotal * prixKg, cur)} strong />
        <Hint>
          Poids linéiques : {DIAMETRES.map((d) => `${d} ${fmt(POIDS_LINEIQUE[d], 3)}`).join(' · ')} kg/m
        </Hint>
      </Card>

      <BigButton label="➕ Envoyer au devis" onPress={envoyerAuDevis} variant="dark" />
    </Screen>
  );
}
