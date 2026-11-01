import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton } from './AppButton';
import { AppInput } from './AppInput';
import { theme } from '../theme';
import {
  normalizeSoftDeletePayload,
  validateSoftDeleteForm,
  type SoftDeleteFormErrors,
  type SoftDeleteFormValues,
} from '../utils/softDelete';

interface AdminSoftDeleteModalProps {
  visible: boolean;
  title: string;
  // The record being deleted, shown so the admin confirms the right one.
  recordName: string;
  impact: string;
  confirmLabel?: string;
  loading?: boolean;
  // Already localized by the server (the client always sends Accept-Language: ar).
  serverError?: string | null;
  onCancel: () => void;
  onConfirm: (payload: SoftDeleteFormValues) => void;
}

const emptyForm: SoftDeleteFormValues = { delete_reason: '', delete_password: '' };

/**
 * Mobile twin of frontend/src/components/AdminSoftDeleteModal.jsx: record
 * name, impact, a required reason and the acting admin's current password.
 */
export function AdminSoftDeleteModal({
  visible,
  title,
  recordName,
  impact,
  confirmLabel = 'تأكيد الحذف',
  loading = false,
  serverError,
  onCancel,
  onConfirm,
}: AdminSoftDeleteModalProps) {
  const [form, setForm] = useState<SoftDeleteFormValues>(emptyForm);
  const [errors, setErrors] = useState<SoftDeleteFormErrors>({});

  useEffect(() => {
    if (!visible) {
      setForm(emptyForm);
      setErrors({});
    }
  }, [visible]);

  function handleConfirm() {
    const nextErrors = validateSoftDeleteForm(form);
    setErrors(nextErrors);
    if (nextErrors.delete_reason || nextErrors.delete_password) return;
    onConfirm(normalizeSoftDeletePayload(form));
  }

  function handleCancel() {
    if (!loading) onCancel();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={styles.card} accessibilityViewIsModal>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text accessibilityRole="header" style={styles.title}>{title}</Text>
            <View style={styles.recordRow}>
              <Text style={styles.recordLabel}>السجل:</Text>
              <Text style={styles.recordName} accessibilityLabel={`السجل المحدد: ${recordName}`}>{recordName}</Text>
            </View>
            <View style={styles.impact} accessibilityRole="text">
              <Text style={styles.impactText}>{impact}</Text>
            </View>
            <AppInput
              label="سبب الحذف *"
              accessibilityLabel="سبب الحذف، حقل مطلوب"
              placeholder="اكتب سبب الحذف لأغراض التدقيق والاسترجاع."
              value={form.delete_reason}
              onChangeText={(text) => {
                setForm((current) => ({ ...current, delete_reason: text }));
                if (errors.delete_reason) setErrors((current) => ({ ...current, delete_reason: undefined }));
              }}
              error={errors.delete_reason}
              editable={!loading}
              multiline
            />
            <AppInput
              label="كلمة مرور حسابك الإداري *"
              accessibilityLabel="كلمة مرور حسابك الإداري الحالية، حقل مطلوب"
              placeholder="أدخل كلمة المرور الحالية لحسابك."
              value={form.delete_password}
              onChangeText={(text) => {
                setForm((current) => ({ ...current, delete_password: text }));
                if (errors.delete_password) setErrors((current) => ({ ...current, delete_password: undefined }));
              }}
              error={errors.delete_password}
              editable={!loading}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
            />
            {serverError ? (
              <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.serverError}>
                {serverError}
              </Text>
            ) : null}
            <View style={styles.actions}>
              <AppButton
                label={confirmLabel}
                variant="danger"
                onPress={handleConfirm}
                loading={loading}
                accessibilityLabel={`${confirmLabel}: ${recordName}`}
                style={styles.action}
              />
              <AppButton label="إلغاء" variant="secondary" onPress={handleCancel} disabled={loading} style={styles.action} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    padding: theme.spacing.screen,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.spacing.radiusLg,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  content: {
    padding: theme.spacing.section,
    gap: theme.spacing.lg,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.size.xl,
    fontFamily: theme.typography.fontFamily.bold,
    textAlign: 'right',
  },
  recordRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  recordLabel: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.size.md,
    fontFamily: theme.typography.fontFamily.regular,
    textAlign: 'right',
  },
  recordName: {
    flexShrink: 1,
    color: theme.colors.text,
    fontSize: theme.typography.size.md,
    fontFamily: theme.typography.fontFamily.bold,
    textAlign: 'right',
  },
  impact: {
    borderWidth: 1,
    borderColor: `${theme.colors.warning}55`,
    backgroundColor: `${theme.colors.warning}18`,
    borderRadius: theme.spacing.radiusMd,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  impactText: {
    color: theme.colors.text,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.md,
    fontFamily: theme.typography.fontFamily.regular,
    textAlign: 'right',
  },
  serverError: {
    color: theme.colors.danger,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    fontFamily: theme.typography.fontFamily.bold,
    textAlign: 'right',
  },
  actions: { flexDirection: 'row-reverse', gap: theme.spacing.md },
  action: { flex: 1 },
});
