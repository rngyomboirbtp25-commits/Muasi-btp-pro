import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Alert, Platform } from 'react-native';
import {
  BigButton,
  Card,
  Choice,
  Field,
  Hint,
  ResultRow,
  Row,
  Screen,
  Stepper,
} from '../components/ui';
import {
  DIMENSIONS_BETON,
  DOSAGES,
  ELEMENTS_BETON,
  calculBeton,
  type ElementBeton,
} from '../lib/beton';
import { fmt, fmtMoney, parseNum } from '../lib/format';
import { usePersistentState } from '../lib/storage';
import { useStore } from '../lib/store';

type BetonState = {
  element: ElementBeton;
  dims: Record<ElementBeton, [string, string, string]>;
  nombre: string;
  marge: number;
  dosage: number;
  prix: { sacCiment: string; sable: string; gravier: string; eau: string };
};

const INITIAL: BetonState = {
  element: 'dalle',
  dims: {
    dalle: ['5', '4', '0,15'],
    poteau: ['0,2', '0,2', '3'],
    semelle: ['1', '1', '0,4'],
    mur: ['6', '2,5', '0,2'],
  },
  nombre: '1',
  marge: 5,
  dosage: 350,
  prix: { sacCiment: '9', sable: '45', gravier: '50', eau: '4' },
};

const NOMS: Record<ElementBeton, string> = {
  dalle: 'Dalle',
  poteau: 'Poteau(x)',
  semelle: 'Semelle(s)',
  mur: 'Mur',
};

function notify(title: string, msg: string) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    globalThis.alert?.(`${title}\n${msg}`);
  } else {
    Alert.alert(title, msg);
  }
}

export default function BetonScreen() {
  const [s, setS] = usePersistentState<BetonState>('beton', INITIAL);
  const { settings, setBetonExport } = useStore();
  const router = useRouter();
  const cur = settings.currency;

  const dimsText = s.dims[s.element];
  const labels = DIMENSIONS_BETON[s.element];

  const r = useMemo(
    () =>
      calculBeton({
        dims: dimsText.map(parseNum) as [number, number, number],
        nombre: parseNum(s.nombre),
        marge: s.marge,
        dosage: s.dosage,
        prix: {
          sacCiment: parseNum(s.prix.sacCiment),
          sable: parseNum(s.prix.sable),
          gravier: parseNum(s.prix.gravier),
          eau: parseNum(s.prix.eau),
        },
      }),
    [dimsText, s.nombre, s.marge, s.dosage, s.prix],
  );

  const setDim = (i: number, t: string) => {
    const next = [...dimsText] as [string, string, string];
    next[i] = t;
    setS({ ...s, dims: { ...s.dims, [s.element]: next } });
  };
  const setPrix = (k: keyof BetonState['prix'], t: string) =>
    setS({ ...s, prix: { ...s.prix, [k]: t } });

  const envoyerAuDevis = () => {
    if (r.volume <= 0) {
      notify('Calcul vide', 'Saisissez des dimensions supérieures à 0.');
      return;
    }
    const titre = `${NOMS[s.element]} ${dimsText.join(' × ')} m × ${s.nombre} — ${fmt(r.volume, 2)} m³ (dosage ${s.dosage} kg/m³)`;
    const p = s.prix;
    setBetonExport({
      titre,
      date: new Date().toISOString(),
      lignes: [
        { designation: `Ciment 50 kg — ${NOMS[s.element].toLowerCase()}`, quantite: r.sacs, unite: 'sac', prixUnitaire: parseNum(p.sacCiment) },
        { designation: `Sable — ${NOMS[s.element].toLowerCase()}`, quantite: round(r.sableM3, 3), unite: 'm³', prixUnitaire: parseNum(p.sable) },
        { designation: `Gravier — ${NOMS[s.element].toLowerCase()}`, quantite: round(r.gravierM3, 3), unite: 'm³', prixUnitaire: parseNum(p.gravier) },
        { designation: `Eau de gâchage — ${NOMS[s.element].toLowerCase()}`, quantite: round(r.eauL / 1000, 3), unite: 'm³', prixUnitaire: parseNum(p.eau) },
      ],
    });
    router.navigate('/devis');
    notify('Prêt pour le devis', 'Ouvrez un devis puis touchez « Importer béton ».');
  };

  return (
    <Screen>
      <Card title="1. Élément">
        <Choice
          options={ELEMENTS_BETON}
          value={s.element}
          onChange={(element) => setS({ ...s, element })}
          columns={2}
        />
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
            onChangeText={(nombre) => setS({ ...s, nombre })}
            keyboardType="number-pad"
          />
        </Row>
        <Stepper
          label="Marge de perte"
          value={s.marge}
          onChange={(marge) => setS({ ...s, marge })}
          min={5}
          max={10}
          suffix=" %"
        />
      </Card>

      <Card title="3. Dosage du ciment (kg/m³)">
        <Choice
          options={DOSAGES.map((d) => ({ value: String(d), label: String(d) }))}
          value={String(s.dosage)}
          onChange={(v) => setS({ ...s, dosage: parseInt(v, 10) })}
          columns={4}
        />
        <Hint>Par m³ de béton : 350 kg = béton armé courant · 400 L de sable · 800 L de gravier · eau ≈ moitié du poids de ciment.</Hint>
      </Card>

      <Card title="Résultats">
        <ResultRow label="Volume net" value={`${fmt(r.volumeNet, 3)} m³`} />
        <ResultRow label={`Volume avec perte (+${s.marge} %)`} value={`${fmt(r.volume, 3)} m³`} strong />
        <ResultRow label={`Ciment (${fmt(r.cimentKg, 0)} kg)`} value={`${r.sacs} sacs de 50 kg`} />
        <ResultRow label="Sable" value={`${fmt(r.sableM3, 2)} m³`} />
        <ResultRow label="Gravier" value={`${fmt(r.gravierM3, 2)} m³`} />
        <ResultRow label="Eau" value={`${fmt(r.eauL, 0)} L`} />
      </Card>

      <Card title={`Prix unitaires (${cur})`}>
        <Row>
          <Field label="Sac de ciment 50 kg" value={s.prix.sacCiment} onChangeText={(t) => setPrix('sacCiment', t)} suffix={cur} />
          <Field label="Sable (par m³)" value={s.prix.sable} onChangeText={(t) => setPrix('sable', t)} suffix={cur} />
        </Row>
        <Row>
          <Field label="Gravier (par m³)" value={s.prix.gravier} onChangeText={(t) => setPrix('gravier', t)} suffix={cur} />
          <Field label="Eau (par m³)" value={s.prix.eau} onChangeText={(t) => setPrix('eau', t)} suffix={cur} />
        </Row>
      </Card>

      <Card title="Coût estimé">
        <ResultRow label="Ciment" value={fmtMoney(r.cout.ciment, cur)} />
        <ResultRow label="Sable" value={fmtMoney(r.cout.sable, cur)} />
        <ResultRow label="Gravier" value={fmtMoney(r.cout.gravier, cur)} />
        <ResultRow label="Eau" value={fmtMoney(r.cout.eau, cur)} />
        <ResultRow label="TOTAL" value={fmtMoney(r.cout.total, cur)} strong />
        {r.volume > 0 ? (
          <Hint>Soit {fmtMoney(r.cout.total / r.volume, cur)} par m³ de béton.</Hint>
        ) : null}
      </Card>

      <BigButton label="➕ Envoyer au devis" onPress={envoyerAuDevis} variant="dark" />
    </Screen>
  );
}

function round(v: number, d: number) {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}
