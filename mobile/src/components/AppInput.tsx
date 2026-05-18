import { Text, TextInput, View, StyleSheet, type TextInputProps } from 'react-native';

import { theme } from '../theme';

interface AppInputProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
}

export function AppInput({ label, error, hint, style, multiline, ...props }: AppInputProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.colors.textMuted}
        multiline={multiline}
        style={[styles.input, multiline && styles.multiline, style]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: theme.spacing.sm },
  label: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
  input: {
    ...theme.components.input,
    color: theme.colors.text,
    fontSize: theme.typography.size.md,
    textAlign: 'right',
    fontFamily: theme.typography.fontFamily.regular,
  },
  multiline: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  error: { color: theme.colors.danger, fontSize: theme.typography.size.sm, textAlign: 'right', fontFamily: theme.typography.fontFamily.regular },
  hint: { color: theme.colors.textMuted, fontSize: theme.typography.size.sm, lineHeight: theme.typography.lineHeight.sm, textAlign: 'right', fontFamily: theme.typography.fontFamily.regular },
});
