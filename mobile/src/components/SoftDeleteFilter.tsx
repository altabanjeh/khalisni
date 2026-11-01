import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';
import { SOFT_DELETE_STATUS_OPTIONS, type SoftDeleteStatus } from '../utils/softDelete';

interface SoftDeleteFilterProps {
  value: SoftDeleteStatus;
  onChange: (value: SoftDeleteStatus) => void;
  // Read by screen readers before the options, e.g. "تصفية الخدمات حسب الحالة".
  accessibilityLabel?: string;
}

/**
 * Active / Deleted / All segmented filter for admin lists (default Active).
 * The app imitates RTL inside a native LTR layout (README "RTL policy"), so
 * the row is reversed: "النشطة" sits on the right.
 */
export function SoftDeleteFilter({ value, onChange, accessibilityLabel = 'تصفية حسب حالة الحذف' }: SoftDeleteFilterProps) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={styles.group}>
      {SOFT_DELETE_STATUS_OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.accessibilityLabel}
            accessibilityState={{ checked: selected, selected }}
            hitSlop={4}
            onPress={() => {
              if (!selected) onChange(option.value);
            }}
            style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && !selected && styles.pressed]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row-reverse',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.spacing.radiusMd,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  option: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.spacing.radiusSm,
    paddingHorizontal: theme.spacing.sm,
  },
  optionSelected: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  pressed: { opacity: 0.85 },
  label: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.md,
  },
  labelSelected: {
    color: theme.colors.primaryDark,
    fontFamily: theme.typography.fontFamily.bold,
  },
});
