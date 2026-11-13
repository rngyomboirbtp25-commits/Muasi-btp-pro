import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, sizes } from '../lib/theme';

export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Card({
  title,
  children,
  style,
}: {
  title?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.card, style]}>
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

type BtnVariant = 'primary' | 'dark' | 'outline' | 'danger' | 'success';

export function BigButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  style,
  small,
}: {
  label: string;
  onPress: () => void;
  variant?: BtnVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const v = btnVariants[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        { backgroundColor: v.bg, borderColor: v.border },
        pressed && { opacity: 0.75 },
        disabled && { opacity: 0.4 },
        style,
      ]}
    >
      <Text style={[styles.btnText, small && { fontSize: sizes.fontSmall }, { color: v.fg }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const btnVariants: Record<BtnVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.border },
  dark: { bg: colors.dark, fg: colors.onDark, border: colors.dark },
  outline: { bg: colors.card, fg: colors.text, border: colors.border },
  danger: { bg: colors.danger, fg: '#FFFFFF', border: colors.danger },
  success: { bg: colors.success, fg: '#FFFFFF', border: colors.success },
};

/** Groupe de gros boutons à choix unique. */
export function Choice<T extends string>({
  options,
  value,
  onChange,
  columns,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  columns?: number;
}) {
  return (
    <View style={styles.choiceWrap}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={({ pressed }) => [
              styles.choice,
              columns ? { flexBasis: `${100 / columns - 4}%`, flexGrow: 1, minWidth: 0, paddingHorizontal: 6 } : null,
              active && styles.choiceActive,
              pressed && { opacity: 0.75 },
            ]}
          >
            <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.choiceText, active && styles.choiceTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  suffix,
  keyboardType = 'decimal-pad',
  placeholder,
  style,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  suffix?: string;
  keyboardType?: KeyboardTypeOptions;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  multiline?: boolean;
}) {
  const inRow = React.useContext(RowContext);
  return (
    <View style={[styles.field, inRow && styles.fieldInRow, style]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor="#777"
          style={[styles.input, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
          selectTextOnFocus
          multiline={multiline}
          accessibilityLabel={label}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

/** Deux (ou plus) champs côte à côte. */
const RowContext = React.createContext(false);

/** Vrai si le composant est placé dans un <Row>. */
export function useInRow() {
  return React.useContext(RowContext);
}

export function Row({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <RowContext.Provider value>
      <View style={[styles.row, style]}>{children}</View>
    </RowContext.Provider>
  );
}

/** Réglage +/- avec gros boutons (ex. marge de perte). */
export function Stepper({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix = '',
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Diminuer ${label}`}
          onPress={() => onChange(clamp(value - step))}
          style={({ pressed }) => [styles.stepBtn, pressed && { opacity: 0.7 }, value <= min && { opacity: 0.35 }]}
        >
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>
        <Text style={styles.stepValue}>
          {value}
          {suffix}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Augmenter ${label}`}
          onPress={() => onChange(clamp(value + step))}
          style={({ pressed }) => [styles.stepBtn, pressed && { opacity: 0.7 }, value >= max && { opacity: 0.35 }]}
        >
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function ResultRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={[styles.resultRow, strong && styles.resultRowStrong]}>
      <Text style={[styles.resultLabel, strong && styles.resultStrongText]}>{label}</Text>
      <Text style={[styles.resultValue, strong && styles.resultStrongText]}>{value}</Text>
    </View>
  );
}

export function Hint({ children }: { children: React.ReactNode }) {
  return <Text style={styles.hint}>{children}</Text>;
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.progressOuter} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}>
      <View style={[styles.progressInner, { width: `${pct}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, paddingBottom: 48, gap: sizes.gap },
  card: {
    backgroundColor: colors.card,
    borderRadius: sizes.radius,
    borderWidth: 2,
    borderColor: colors.border,
    padding: 14,
    gap: sizes.gap,
  },
  cardTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  btn: {
    minHeight: sizes.touch,
    borderRadius: sizes.radius,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  btnSmall: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 6 },
  btnText: { fontSize: sizes.font, fontWeight: '800', textAlign: 'center' },
  choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    minHeight: sizes.touch,
    minWidth: 72,
    paddingHorizontal: 14,
    borderRadius: sizes.radius,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceActive: { backgroundColor: colors.dark },
  choiceText: { fontSize: sizes.font, fontWeight: '700', color: colors.text },
  choiceTextActive: { color: colors.primary },
  field: { gap: 6 },
  fieldInRow: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 130 },
  label: { fontSize: sizes.fontSmall, fontWeight: '700', color: colors.text },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    minWidth: 0,
    width: '100%',
    minHeight: sizes.touch,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: sizes.radius,
    backgroundColor: colors.inputBg,
    paddingHorizontal: 12,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  suffix: { fontSize: sizes.font, fontWeight: '700', color: colors.textMuted, minWidth: 28 },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: {
    width: sizes.touch,
    height: sizes.touch,
    borderRadius: sizes.radius,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { color: colors.primary, fontSize: 30, fontWeight: '900', lineHeight: 34 },
  stepValue: { fontSize: 26, fontWeight: '900', color: colors.text, minWidth: 70, textAlign: 'center' },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#CCCCCC',
    gap: 10,
  },
  resultRowStrong: {
    backgroundColor: colors.dark,
    borderRadius: sizes.radius,
    paddingHorizontal: 12,
    borderBottomWidth: 0,
    marginTop: 4,
  },
  resultLabel: { fontSize: sizes.font, color: colors.text, flexShrink: 1 },
  resultValue: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'right' },
  resultStrongText: { color: colors.primary, fontWeight: '900' },
  hint: { fontSize: sizes.fontSmall, color: colors.textMuted },
  sectionLabel: { fontSize: sizes.font, fontWeight: '800', color: colors.text, marginTop: 4 },
  progressOuter: {
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  progressInner: { height: '100%', backgroundColor: colors.success },
});
