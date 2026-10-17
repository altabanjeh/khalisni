import { Alert, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { AppButton } from '../../../components/AppButton';
import { AppCard } from '../../../components/AppCard';
import { AppScreen } from '../../../components/AppScreen';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { LoadingState } from '../../../components/LoadingState';
import { StatusBadge } from '../../../components/StatusBadge';
import { documentsApi } from '../../../api/documents.api';
import { ordersApi } from '../../../api/orders.api';
import { getDisplayError, normalizeApiError } from '../../../api/client';
import { findRequirement, getRequirementLabel } from '../../../utils/documentPresentation';
import { buildUploadHint, getUploadRules, validateUploadableFile } from '../../../utils/serviceForms';
import type { UploadableDocument } from '../../../types/document';
import type { ServiceRequirement } from '../../../types/service';
import { theme } from '../../../theme';

const MIME_BY_EXTENSION: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

// Picker filter from the requirement's allowed extensions; any extension we
// cannot map opens the picker unfiltered (the file is still validated).
function pickerTypes(requirement?: ServiceRequirement | null) {
  const extensions = getUploadRules(requirement).allowed_extensions;
  const types = extensions.map((extension) => MIME_BY_EXTENSION[extension]);
  if (!types.length || types.some((type) => !type)) return ['*/*'];
  return [...new Set(types)];
}

// The customer answers a missing-document request by picking a file for each
// requested document; the screen lists the requested documents by their
// Arabic names (never the internal code) and applies each requirement's own
// extensions and size limit. Same flow as the web
// (frontend/src/pages/customer/MissingDocumentsResponsePage.jsx): each file is
// uploaded to POST /api/customer/orders/<id>/documents/, and the backend sends
// the order back to review once every requested document is in.
export function RespondToMissingDocumentScreen({ route, navigation }: { route: any; navigation: any }) {
  const orderId = route.params?.orderId;
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['client-order', orderId],
    queryFn: () => ordersApi.getCustomerOrder(orderId),
    enabled: !!orderId,
  });
  const [files, setFiles] = useState<Record<string, UploadableDocument>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Document types this screen already uploaded: a retry after a partial
  // failure must not send them again.
  const uploadedTypesRef = useRef(new Set<string>());

  if (query.isLoading) {
    return <LoadingState />;
  }

  if (query.isError || !query.data) {
    return (
      <AppScreen title="الرد على النواقص">
        <ErrorState message={query.isError ? getDisplayError(query.error) : 'تعذر العثور على الطلب.'} onRetry={query.refetch} />
      </AppScreen>
    );
  }

  const order = query.data;
  const requestedTypes = order.missing_document_types ?? [];
  const requirements = order.required_documents ?? [];
  const customerNotes = (order.notes ?? []).filter((note) => !note.visibility || note.visibility === 'CUSTOMER');
  const canRespond = order.allowed_actions?.can_view_missing_documents_form ?? order.status === 'WAITING_CUSTOMER';

  const notesCard = customerNotes.length ? (
    <AppCard variant="muted">
      <Text style={styles.sectionTitle}>ملاحظة الفريق</Text>
      {customerNotes.map((note) => (
        <Text key={note.id} style={styles.body}>{note.note}</Text>
      ))}
    </AppCard>
  ) : null;

  if (!canRespond) {
    return (
      <AppScreen title="الرد على النواقص">
        <EmptyState
          title="لا توجد مستندات ناقصة حالياً"
          description="تُستخدم هذه الشاشة فقط عندما يكون الطلب بانتظار مستندات منك."
          actionLabel="العودة إلى تفاصيل الطلب"
          onAction={() => navigation.goBack()}
        />
      </AppScreen>
    );
  }

  // A waiting order whose request names nothing uploadable cannot be answered
  // here: no form, no resubmit, no success message.
  if (order.allowed_actions?.missing_document_request_valid === false || !requestedTypes.length) {
    return (
      <AppScreen title="الرد على النواقص">
        <EmptyState
          title={`لا يمكن الرد على الطلب ${order.order_number} حالياً`}
          description="لا توجد حالياً مستندات قابلة للرفع لهذا الطلب. يرجى انتظار مراجعة الطلب من فريق خلصني أو التواصل مع الدعم."
        />
        {notesCard}
        <AppButton label="العودة إلى تفاصيل الطلب" variant="secondary" onPress={() => navigation.goBack()} />
      </AppScreen>
    );
  }

  const existingStatus = (documentType: string) => {
    const document = (order.documents ?? []).find((item) => !item.is_final_document && item.document_type === documentType);
    return document?.status ?? null;
  };

  const clearError = (documentType: string) =>
    setErrors((current) => {
      if (!current[documentType]) return current;
      const next = { ...current };
      delete next[documentType];
      return next;
    });

  const pickFile = async (documentType: string, requirement?: ServiceRequirement) => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: pickerTypes(requirement),
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const file: UploadableDocument = {
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType,
      size: asset.size,
    };
    const error = validateUploadableFile(file, requirement);
    if (error) {
      setErrors((current) => ({ ...current, [documentType]: error }));
      return;
    }
    clearError(documentType);
    setFiles((current) => ({ ...current, [documentType]: file }));
  };

  const submit = async () => {
    setGeneralError('');
    const pending = requestedTypes.filter((documentType) => !uploadedTypesRef.current.has(documentType));
    const missing: Record<string, string> = {};
    pending.forEach((documentType) => {
      if (!files[documentType]) missing[documentType] = 'هذا المستند مطلوب قبل إعادة الإرسال.';
    });
    if (Object.keys(missing).length) {
      setErrors((current) => ({ ...current, ...missing }));
      setGeneralError('اختر ملفاً لكل مستند مطلوب.');
      return;
    }

    setSubmitting(true);
    let uploadedNow = 0;
    try {
      for (const documentType of pending) {
        const file = files[documentType];
        const formData = new FormData();
        formData.append('document_type', documentType);
        formData.append('file', {
          uri: file.uri,
          name: file.name,
          type: file.mimeType ?? 'application/octet-stream',
        } as any);
        try {
          await documentsApi.uploadCustomerDocument(orderId, formData);
        } catch (uploadError) {
          const apiError = normalizeApiError(uploadError);
          setErrors((current) => ({
            ...current,
            [documentType]: apiError.documentErrors?.[documentType] ?? apiError.message,
          }));
          throw uploadError;
        }
        uploadedTypesRef.current.add(documentType);
        uploadedNow += 1;
      }

      await queryClient.invalidateQueries({ queryKey: ['client-orders'] });
      // Success is reported from the server's resulting state, not assumed.
      const refreshed = await ordersApi.getCustomerOrder(orderId);
      queryClient.setQueryData(['client-order', orderId], refreshed);
      if (refreshed?.status && refreshed.status !== 'WAITING_CUSTOMER') {
        Alert.alert('تم', 'تم رفع المستندات وإعادة إرسال الطلب للمراجعة.');
        navigation.goBack();
      } else {
        Alert.alert('تم الرفع', uploadedNow
          ? 'تم رفع المستندات، وما زال الطلب بانتظار مستندات أخرى.'
          : 'لم يُرفع أي مستند جديد.');
        setFiles({});
      }
    } catch (error) {
      setGeneralError(getDisplayError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const total = requestedTypes.length;
  const ready = requestedTypes.filter((documentType) => files[documentType] || uploadedTypesRef.current.has(documentType)).length;

  return (
    <AppScreen
      title="الرد على النواقص"
      subtitle={`الطلب ${order.order_number}: ارفع كل مستند مطلوب لإعادة الطلب إلى مسار التنفيذ.`}
      refreshing={query.isRefetching}
      onRefresh={query.refetch}
    >
      <StatusBadge status={order.status} />
      {notesCard}
      <Text style={styles.progress}>الجاهز للإرسال: {ready} من {total}</Text>

      {requestedTypes.map((documentType, index) => {
        const requirement = findRequirement(requirements, documentType);
        const label = getRequirementLabel(requirement);
        const numberedLabel = requirement ? label : `${label} ${index + 1}`;
        const file = files[documentType];
        const done = uploadedTypesRef.current.has(documentType);
        const status = existingStatus(documentType);

        return (
          <AppCard key={documentType}>
            <View style={styles.cardHeader}>
              <Text style={styles.sectionTitle}>{numberedLabel}</Text>
              {done ? (
                <Text style={styles.ready}>تم الرفع</Text>
              ) : file ? (
                <Text style={styles.ready}>جاهز للإرسال</Text>
              ) : status ? (
                <StatusBadge status={status} />
              ) : null}
            </View>
            {requirement?.instructions_ar ? <Text style={styles.body}>{requirement.instructions_ar}</Text> : null}
            <Text style={styles.hint}>{buildUploadHint(requirement)}</Text>
            {!done ? (
              <AppButton
                label={file ? `تم اختيار: ${file.name}` : 'اختيار ملف'}
                variant="secondary"
                onPress={() => void pickFile(documentType, requirement)}
                disabled={submitting}
              />
            ) : null}
            {errors[documentType] ? <Text style={styles.error}>{errors[documentType]}</Text> : null}
          </AppCard>
        );
      })}

      {generalError ? <Text style={styles.error}>{generalError}</Text> : null}
      <AppButton label="رفع المستندات وإعادة الإرسال" onPress={() => void submit()} loading={submitting} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    flex: 1,
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.md,
    textAlign: 'right',
  },
  body: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    textAlign: 'right',
  },
  hint: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
  progress: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
  ready: {
    color: theme.colors.success,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.sm,
  },
  error: {
    color: theme.colors.danger,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
});
