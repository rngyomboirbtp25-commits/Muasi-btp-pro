import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  DAYS_FR_SHORT,
  MONTHS_FR,
  fmtDate,
  fromISODate,
  toISODate,
  todayISO,
} from '../lib/format';
import { colors, sizes } from '../lib/theme';
import { BigButton, useInRow } from './ui';

/** Champ date avec calendrier intégré (100 % JavaScript, fonctionne hors ligne et dans Expo Go). */
export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const inRow = useInRow();
  return (
    <View style={[styles.field, inRow && styles.fieldInRow]}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} : ${fmtDate(value)}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.input, pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.inputText}>📆 {fmtDate(value)}</Text>
      </Pressable>
      <CalendarModal
        visible={open}
        value={value}
        onClose={() => setOpen(false)}
        onPick={(iso) => {
          onChange(iso);
          setOpen(false);
        }}
      />
    </View>
  );
}

function CalendarModal({
  visible,
  value,
  onClose,
  onPick,
}: {
  visible: boolean;
  value: string;
  onClose: () => void;
  onPick: (iso: string) => void;
}) {
  const initial = fromISODate(value || todayISO());
  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth());

  // Recentrer sur la date choisie à chaque ouverture
  React.useEffect(() => {
    if (visible) {
      const d = fromISODate(value || todayISO());
      setYear(d.getFullYear());
      setMonth(d.getMonth());
    }
  }, [visible, value]);

  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // lundi = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7) cells.push(null);
  const today = todayISO();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Pressable onPress={() => shift(-1)} style={styles.navBtn} accessibilityLabel="Mois précédent">
              <Text style={styles.navText}>‹</Text>
            </Pressable>
            <Text style={styles.monthTitle}>
              {MONTHS_FR[month]} {year}
            </Text>
            <Pressable onPress={() => shift(1)} style={styles.navBtn} accessibilityLabel="Mois suivant">
              <Text style={styles.navText}>›</Text>
            </Pressable>
          </View>
          <View style={styles.grid}>
            {DAYS_FR_SHORT.map((d, i) => (
              <Text key={`h${i}`} style={styles.dayHead}>
                {d}
              </Text>
            ))}
            {cells.map((d, i) => {
              if (d == null) return <View key={`e${i}`} style={styles.cell} />;
              const iso = toISODate(new Date(year, month, d));
              const selected = iso === value;
              const isToday = iso === today;
              return (
                <Pressable
                  key={iso}
                  onPress={() => onPick(iso)}
                  accessibilityLabel={fmtDate(iso)}
                  style={({ pressed }) => [
                    styles.cell,
                    styles.dayCell,
                    isToday && styles.todayCell,
                    selected && styles.selectedCell,
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <Text style={[styles.dayText, selected && { color: colors.primary }]}>{d}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <BigButton label="Aujourd'hui" variant="outline" onPress={() => onPick(today)} style={{ flex: 1 }} />
            <BigButton label="Fermer" variant="dark" onPress={onClose} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  fieldInRow: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 150 },
  label: { fontSize: sizes.fontSmall, fontWeight: '700', color: colors.text },
  input: {
    minHeight: sizes.touch,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: sizes.radius,
    backgroundColor: colors.inputBg,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  inputText: { fontSize: 20, fontWeight: '700', color: colors.text },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 12,
  },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: {
    width: sizes.touch,
    height: sizes.touch,
    borderRadius: sizes.radius,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: { color: colors.primary, fontSize: 34, fontWeight: '900', lineHeight: 38 },
  monthTitle: { fontSize: 22, fontWeight: '900', color: colors.text, textTransform: 'capitalize' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayHead: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: colors.textMuted,
    paddingVertical: 6,
  },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  dayCell: { alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  todayCell: { borderWidth: 2, borderColor: colors.border },
  selectedCell: { backgroundColor: colors.dark },
  dayText: { fontSize: 20, fontWeight: '800', color: colors.text },
});
