import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AppButton } from '../../../components/AppButton';
import { AppCard } from '../../../components/AppCard';
import { AppInput } from '../../../components/AppInput';
import { AppScreen } from '../../../components/AppScreen';
import { ErrorState } from '../../../components/ErrorState';
import { LoadingState } from '../../../components/LoadingState';
import { PublicServiceCard } from '../../../components/public/PublicServiceCard';
import { ordersApi } from '../../../api/orders.api';
import { servicesApi } from '../../../api/services.api';
import { getDisplayError } from '../../../api/client';
import { useAuthStore } from '../../../state/authStore';
import { theme } from '../../../theme';
import type { UploadableDocument } from '../../../types/document';
import type { ServiceRequirement } from '../../../types/service';
import {
  buildDynamicNotes,
  buildUploadHint,
  getDocumentFieldName,
  getRequiredDocumentLabel,
  getRequiredDocumentType,
  getServiceSchemaFields,
  validateUploadableFile,
} from '../../../utils/serviceForms';

function getKeyboardType(type: string) {
  if (type === 'number') return 'number-pad' as const;
  if (type === 'email') return 'email-address' as const;
  if (type === 'tel') return 'phone-pad' as const;
  return 'default' as const;
}

function buildDocumentPart(file: UploadableDocument) {
  return {
    uri: file.uri,
    name: file.name,
    type: file.mimeType ?? 'application/octet-stream',
  } as any;
}

export function CreateOrderScreen({ route, navigation }: { route: any; navigation: any }) {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const initialServiceId = route.params?.serviceId ? Number(route.params.serviceId) : null;
  const initialSlug = route.params?.slug;

  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(initialServiceId);
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [nationalId, setNationalId] = useState(user?.national_id ?? '');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  const [consent, setConsent] = useState(false);
  const [dynamicValues, setDynamicValues] = useState<Record<string, string | boolean>>({});
  const [selectedDocuments, setSelectedDocuments] = useState<Record<string, UploadableDocument>>({});
  const [generalDocuments, setGeneralDocuments] = useState<UploadableDocument[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');

  const servicesQuery = useQuery({ queryKey: ['services'], queryFn: () => servicesApi.getServices() });

  useEffect(() => {
    if (selectedServiceId || !servicesQuery.data?.length) return;

    const matchedService = initialSlug
      ? servicesQuery.data.find((service) => service.slug === initialSlug)
      : null;

    setSelectedServiceId(matchedService?.id ?? servicesQuery.data[0].id);
  }, [initialSlug, selectedServiceId, servicesQuery.data]);

  const selectedService = useMemo(
    () => (servicesQuery.data ?? []).find((service) => service.id === selectedServiceId) ?? null,
    [selectedServiceId, servicesQuery.data],
  );

  const serviceDetailQuery = useQuery({
    queryKey: ['service', selectedService?.slug],
    queryFn: () => servicesApi.getService(selectedService!.slug),
    enabled: !!selectedService?.slug,
  });

  const serviceDetail = serviceDetailQuery.data;
  const schemaFields = getServiceSchemaFields(serviceDetail);
  const requiredDocuments = serviceDetail?.required_documents ?? [];

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const validationErrors: Record<string, string> = {};

      if (!selectedServiceId) validationErrors.service = 'يرجى اختيار الخدمة.';
      if (!fullName.trim()) validationErrors.full_name = 'الاسم الكامل مطلوب.';
      if (!phone.trim()) validationErrors.phone = 'رقم الهاتف مطلوب.';
      if (!city.trim()) validationErrors.city = 'المدينة مطلوبة.';
      if (!consent) validationErrors.consent = 'يجب الموافقة على الشروط قبل الإرسال.';

      schemaFields.forEach((field) => {
        const value = dynamicValues[field.inputName];
        if (!field.required) return;
        if (field.type === 'checkbox' && !value) {
          validationErrors[field.inputName] = `${field.label} مطلوب.`;
          return;
        }
        if (field.type !== 'checkbox' && !String(value || '').trim()) {
          validationErrors[field.inputName] = `${field.label} مطلوب.`;
        }
      });

      requiredDocuments.forEach((document, index) => {
        const fieldName = getDocumentFieldName(document, index);
        if (document.is_required === false) return;
        if (!selectedDocuments[fieldName]) {
          validationErrors[fieldName] = `الملف ${getRequiredDocumentLabel(document)} مطلوب.`;
        }
      });

      setErrors(validationErrors);
      setServerError('');

      if (Object.keys(validationErrors).length) {
        throw new Error('validation');
      }

      const formData = new FormData();
      formData.append('service', String(selectedServiceId));
      formData.append('full_name', fullName.trim());
      formData.append('phone', phone.trim());
      formData.append('national_id', nationalId.trim());
      formData.append('city', city.trim());
      formData.append('notes', buildDynamicNotes(notes, schemaFields, dynamicValues));
      formData.append('consent', consent ? 'true' : 'false');

      if (requiredDocuments.length) {
        requiredDocuments.forEach((document, index) => {
          const fieldName = getDocumentFieldName(document, index);
          const file = selectedDocuments[fieldName];
          if (!file) return;
          formData.append('document_types', getRequiredDocumentType(document, index));
          formData.append('documents', buildDocumentPart(file));
        });
      } else {
        generalDocuments.forEach((file) => {
          formData.append('document_types', 'customer_upload');
          formData.append('documents', buildDocumentPart(file));
        });
      }

      return ordersApi.createOrder(formData);
    },
    onSuccess: async (order) => {
      await queryClient.invalidateQueries({ queryKey: ['client-orders'] });
      Alert.alert('تم إنشاء الطلب', `رقم الطلب ${order.order_number}`);
      navigation.replace('ClientOrderDetail', { orderId: order.id });
    },
    onError: (error) => {
      if (error instanceof Error && error.message === 'validation') return;
      setServerError(getDisplayError(error));
    },
  });

  const pickDocument = async (document?: ServiceRequirement, index = 0) => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ['*/*'],
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const file: UploadableDocument = {
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType,
      size: asset.size,
    };
    const error = validateUploadableFile(file, document);
    if (error) {
      Alert.alert('ملف غير صالح', error);
      return;
    }

    if (document) {
      const fieldName = getDocumentFieldName(document, index);
      setSelectedDocuments((current) => ({ ...current, [fieldName]: file }));
      setErrors((current) => {
        const next = { ...current };
        delete next[fieldName];
        return next;
      });
      return;
    }

    setGeneralDocuments((current) => [...current, file]);
  };

  if (servicesQuery.isLoading || (selectedService && serviceDetailQuery.isLoading)) {
    return <LoadingState />;
  }

  if (servicesQuery.isError || serviceDetailQuery.isError) {
    return (
      <ErrorState
        message={getDisplayError(servicesQuery.error ?? serviceDetailQuery.error)}
        onRetry={() => {
          servicesQuery.refetch();
          serviceDetailQuery.refetch();
        }}
      />
    );
  }

  return (
    <AppScreen title="طلب خدمة" subtitle="أدخل بياناتك وارفع الوثائق بنفس منطق نموذج الموقع، لكن بترتيب مناسب للجوال.">
      <View style={styles.stack}>
        <AppCard style={styles.stack}>
          <Text style={styles.sectionTitle}>الخدمة المختارة</Text>
          {selectedService ? (
            <PublicServiceCard service={selectedService} />
          ) : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.servicePicker}>
            {(servicesQuery.data ?? []).map((service) => (
              <AppButton
                key={service.id}
                label={service.name_ar}
                onPress={() => {
                  setSelectedServiceId(service.id);
                  setSelectedDocuments({});
                  setGeneralDocuments([]);
                  setErrors({});
                }}
                variant={selectedServiceId === service.id ? 'primary' : 'secondary'}
              />
            ))}
          </ScrollView>
          {errors.service ? <Text style={styles.errorText}>{errors.service}</Text> : null}
        </AppCard>

        <AppCard style={styles.stack}>
          <Text style={styles.sectionTitle}>بيانات الطلب</Text>
          <AppInput label="الاسم الكامل" value={fullName} onChangeText={setFullName} error={errors.full_name} />
          <AppInput label="رقم الهاتف" value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={errors.phone} />
          <AppInput label="الرقم الوطني" value={nationalId} onChangeText={setNationalId} />
          <AppInput label="المدينة" value={city} onChangeText={setCity} error={errors.city} />
          <AppInput label="ملاحظات" value={notes} onChangeText={setNotes} multiline />
        </AppCard>

        {schemaFields.length ? (
          <AppCard style={styles.stack}>
            <Text style={styles.sectionTitle}>البيانات الإضافية المطلوبة</Text>
            {schemaFields.map((field) => (
              <View key={field.inputName} style={styles.stack}>
                {field.type === 'checkbox' ? (
                  <View style={styles.toggleRow}>
                    <Switch
                      value={Boolean(dynamicValues[field.inputName])}
                      onValueChange={(value) => setDynamicValues((current) => ({ ...current, [field.inputName]: value }))}
                    />
                    <View style={styles.toggleText}>
                      <Text style={styles.toggleTitle}>{field.label}</Text>
                      {field.helpText ? <Text style={styles.toggleHint}>{field.helpText}</Text> : null}
                    </View>
                  </View>
                ) : field.type === 'select' ? (
                  <View style={styles.stack}>
                    <Text style={styles.fieldLabel}>{field.label}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
                      {field.options.map((option) => (
                        <AppButton
                          key={option.value}
                          label={option.label}
                          onPress={() => setDynamicValues((current) => ({ ...current, [field.inputName]: option.value }))}
                          variant={dynamicValues[field.inputName] === option.value ? 'primary' : 'secondary'}
                        />
                      ))}
                    </ScrollView>
                  </View>
                ) : (
                  <AppInput
                    label={field.label}
                    value={String(dynamicValues[field.inputName] || '')}
                    onChangeText={(value) => setDynamicValues((current) => ({ ...current, [field.inputName]: value }))}
                    keyboardType={getKeyboardType(field.type)}
                    multiline={field.type === 'textarea'}
                    placeholder={field.placeholder}
                    hint={field.helpText}
                    error={errors[field.inputName]}
                  />
                )}
                {field.type !== 'textarea' && field.type !== 'select' && field.type !== 'checkbox' && errors[field.inputName] ? (
                  <Text style={styles.errorText}>{errors[field.inputName]}</Text>
                ) : null}
                {field.type === 'select' && errors[field.inputName] ? <Text style={styles.errorText}>{errors[field.inputName]}</Text> : null}
                {field.type === 'checkbox' && errors[field.inputName] ? <Text style={styles.errorText}>{errors[field.inputName]}</Text> : null}
              </View>
            ))}
          </AppCard>
        ) : null}

        <AppCard style={styles.stack}>
          <Text style={styles.sectionTitle}>الوثائق المطلوبة</Text>
          {requiredDocuments.length ? (
            requiredDocuments.map((document, index) => {
              const fieldName = getDocumentFieldName(document, index);
              const selectedFile = selectedDocuments[fieldName];

              return (
                <AppCard key={fieldName} variant="muted" style={styles.documentCard}>
                  <Text style={styles.documentTitle}>{getRequiredDocumentLabel(document)}</Text>
                  <Text style={styles.documentHint}>{buildUploadHint(document)}</Text>
                  <Text style={styles.documentHint}>{document.is_required === false ? 'ملف اختياري' : 'ملف مطلوب'}</Text>
                  <AppButton
                    label={selectedFile ? `تم الاختيار: ${selectedFile.name}` : 'اختيار ملف'}
                    onPress={() => void pickDocument(document, index)}
                    variant="secondary"
                  />
                  {selectedFile ? (
                    <Pressable
                      onPress={() =>
                        setSelectedDocuments((current) => {
                          const next = { ...current };
                          delete next[fieldName];
                          return next;
                        })
                      }
                    >
                      <Text style={styles.removeText}>إزالة الملف</Text>
                    </Pressable>
                  ) : null}
                  {errors[fieldName] ? <Text style={styles.errorText}>{errors[fieldName]}</Text> : null}
                </AppCard>
              );
            })
          ) : (
            <AppCard variant="muted" style={styles.stack}>
              <Text style={styles.documentHint}>لا توجد وثائق محددة لهذه الخدمة. يمكنك إرفاق ملفات داعمة إذا لزم الأمر.</Text>
              <AppButton label="إضافة مرفق" onPress={() => void pickDocument()} variant="secondary" />
              {generalDocuments.map((file) => (
                <Text key={`${file.name}-${file.uri}`} style={styles.documentHint}>
                  {file.name}
                </Text>
              ))}
            </AppCard>
          )}
        </AppCard>

        <AppCard variant="muted" style={styles.consentCard}>
          <View style={styles.toggleRow}>
            <Switch value={consent} onValueChange={setConsent} />
            <View style={styles.toggleText}>
              <Text style={styles.toggleTitle}>أوافق على استخدام بياناتي ووثائقي لأغراض تنفيذ الخدمة فقط.</Text>
            </View>
          </View>
          {errors.consent ? <Text style={styles.errorText}>{errors.consent}</Text> : null}
        </AppCard>

        <AppCard style={styles.stack}>
          <Text style={styles.sectionTitle}>بعد الإرسال</Text>
          <Text style={styles.infoText}>سيتم إنشاء رقم طلب فوري لمتابعة حالته.</Text>
          <Text style={styles.infoText}>سيقوم فريق العمليات بمراجعة الوثائق أولاً.</Text>
          <Text style={styles.infoText}>إذا كانت هناك وثائق ناقصة سيصلك طلب استكمال.</Text>
          <Text style={styles.infoText}>عند الإنجاز ستتمكن من تنزيل النتيجة النهائية.</Text>
        </AppCard>

        {serverError ? <Text style={styles.errorText}>{serverError}</Text> : null}

        <AppButton
          label="إرسال الطلب"
          onPress={() => createOrderMutation.mutate()}
          loading={createOrderMutation.isPending}
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.extraBold,
    fontSize: theme.typography.size.xl,
    textAlign: 'right',
  },
  servicePicker: {
    gap: theme.spacing.sm,
  },
  fieldLabel: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  toggleText: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  toggleTitle: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
  toggleHint: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
  optionRow: {
    gap: theme.spacing.sm,
  },
  documentCard: {
    gap: theme.spacing.sm,
  },
  documentTitle: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.md,
    textAlign: 'right',
  },
  documentHint: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    textAlign: 'right',
  },
  removeText: {
    color: theme.colors.danger,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
  consentCard: {
    gap: theme.spacing.sm,
  },
  infoText: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    textAlign: 'right',
  },
  errorText: {
    color: theme.colors.danger,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
});
