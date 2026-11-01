import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { theme } from '../theme';
import {
  repeaterErrorKey,
  repeaterMinimum,
  type RepeaterRow,
  type ServiceSchemaField,
} from '../utils/serviceForms';
import { AppButton } from './AppButton';
import { AppCard } from './AppCard';
import { AppInput } from './AppInput';

function keyboardFor(type: string) {
  if (type === 'number') return 'number-pad' as const;
  if (type === 'email') return 'email-address' as const;
  if (type === 'tel') return 'phone-pad' as const;
  return 'default' as const;
}

interface RepeaterFieldProps {
  field: ServiceSchemaField;
  rows: RepeaterRow[];
  errors: Record<string, string>;
  onChange: (rows: RepeaterRow[]) => void;
}

/**
 * A repeated group of inputs (CN-BIZ-01 partners, CN-BIZ-04 plots): numbered
 * rows, one card each, with add / remove buttons. Rows are kept in the order
 * shown; the answers are sent in that order so server errors keyed by row
 * index land on the right row.
 */
export function RepeaterField({ field, rows, errors, onChange }: RepeaterFieldProps) {
  const minimum = repeaterMinimum(field);
  const atMaximum = rows.length >= field.maxItems;
  // A required repeater keeps its minimum rows; an optional one may be emptied
  // while it has at most one row (it then sends nothing).
  const canRemove = rows.length > minimum || (!field.required && minimum <= 1 && rows.length > 0);

  const updateCell = (rowIndex: number, itemKey: string, value: string | boolean) => {
    onChange(rows.map((row, index) => (index === rowIndex ? { ...row, [itemKey]: value } : row)));
  };

  return (
    <View style={styles.stack}>
      <Text style={styles.fieldLabel}>{field.required ? `${field.label} *` : field.label}</Text>
      {field.helpText ? <Text style={styles.hint}>{field.helpText}</Text> : null}
      {rows.map((row, rowIndex) => (
        <AppCard key={`${field.inputName}-${rowIndex}`} variant="muted" style={styles.rowCard}>
          <View style={styles.rowHeader}>
            <Text style={styles.rowTitle}>{`الإدخال ${rowIndex + 1}`}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`حذف الإدخال ${rowIndex + 1} من ${field.label}`}
              accessibilityState={{ disabled: !canRemove }}
              disabled={!canRemove}
              hitSlop={4}
              onPress={() => onChange(rows.filter((_, index) => index !== rowIndex))}
              style={({ pressed }) => [styles.removeButton, !canRemove && styles.disabled, pressed && canRemove && styles.pressed]}
            >
              <Text style={styles.removeText}>حذف</Text>
            </Pressable>
          </View>
          {field.itemFields.map((item) => {
            const errorKey = repeaterErrorKey(field, rowIndex, item.key);
            const value = row[item.key];
            const label = item.required ? `${item.label} *` : item.label;
            if (item.type === 'checkbox') {
              return (
                <View key={errorKey} style={styles.stack}>
                  <View style={styles.toggleRow}>
                    <Switch
                      accessibilityLabel={`${item.label} - الإدخال ${rowIndex + 1}`}
                      value={value === true || value === 'true'}
                      onValueChange={(next) => updateCell(rowIndex, item.key, next)}
                    />
                    <Text style={styles.toggleTitle}>{label}</Text>
                  </View>
                  {errors[errorKey] ? <Text style={styles.errorText}>{errors[errorKey]}</Text> : null}
                </View>
              );
            }
            if (item.type === 'select') {
              return (
                <View key={errorKey} style={styles.stack}>
                  <Text style={styles.itemLabel}>{label}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
                    {item.options.map((option) => (
                      <AppButton
                        key={option.value}
                        label={option.label}
                        accessibilityLabel={`${item.label}: ${option.label} - الإدخال ${rowIndex + 1}`}
                        onPress={() => updateCell(rowIndex, item.key, option.value)}
                        variant={value === option.value ? 'primary' : 'secondary'}
                      />
                    ))}
                  </ScrollView>
                  {errors[errorKey] ? <Text style={styles.errorText}>{errors[errorKey]}</Text> : null}
                </View>
              );
            }
            return (
              <AppInput
                key={errorKey}
                label={label}
                accessibilityLabel={`${item.label} - الإدخال ${rowIndex + 1}`}
                value={typeof value === 'string' ? value : ''}
                onChangeText={(next) => updateCell(rowIndex, item.key, next)}
                keyboardType={keyboardFor(item.type)}
                multiline={item.type === 'textarea'}
                placeholder={item.placeholder || undefined}
                hint={item.helpText}
                error={errors[errorKey]}
              />
            );
          })}
        </AppCard>
      ))}
      <AppButton
        label="إضافة إدخال"
        accessibilityLabel={`إضافة إدخال إلى ${field.label}`}
        accessibilityState={{ disabled: atMaximum }}
        disabled={atMaximum}
        onPress={() => onChange([...rows, {}])}
        variant="secondary"
      />
      <Text style={styles.hint}>
        {atMaximum
          ? `بلغت الحد الأقصى (${field.maxItems}).`
          : minimum > 1
            ? `أدخل ${minimum} إدخالات على الأقل، وحتى ${field.maxItems}.`
            : `يمكنك إضافة حتى ${field.maxItems} إدخالاً.`}
      </Text>
      {errors[field.inputName] ? <Text style={styles.errorText}>{errors[field.inputName]}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: theme.spacing.sm },
  rowCard: { gap: theme.spacing.sm },
  rowHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowTitle: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.md,
    textAlign: 'right',
  },
  fieldLabel: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
  itemLabel: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
  hint: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    textAlign: 'right',
  },
  removeButton: {
    alignItems: 'center',
    borderColor: theme.colors.danger,
    borderRadius: theme.spacing.radiusMd,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 64,
    paddingHorizontal: theme.spacing.md,
  },
  removeText: {
    color: theme.colors.danger,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.sm,
  },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
    minHeight: 44,
  },
  toggleTitle: {
    color: theme.colors.text,
    flex: 1,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
  optionRow: { gap: theme.spacing.sm },
  errorText: {
    color: theme.colors.danger,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
});
