import { StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { ordersApi } from '../../api/orders.api';
import { normalizeApiError } from '../../api/client';
import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import { AppInput } from '../../components/AppInput';
import { AppScreen } from '../../components/AppScreen';
import { OrderTimeline } from '../../components/OrderTimeline';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuthStore } from '../../state/authStore';
import { theme } from '../../theme';
import type { TrackOrderResult } from '../../types/order';
import { PHONE_FORMAT_HINT_AR, PHONE_PLACEHOLDER } from '../../utils/registration';
import { buildTrackParams, describeTrackError, summarizeTracking, validateTrackInput } from '../../utils/tracking';

// Public order tracking (audit M-14), the mobile counterpart of the web
// /track-order page: order number + phone, GET /api/orders/track/. Shows the
// Arabic status, the timeline the backend allows publicly and the requested
// documents by name. Uploading needs the customer's account, so the screen
// asks the visitor to sign in (or opens the order for a signed-in customer).
export function TrackOrderScreen({ navigation }: { navigation: any }) {
  const isCustomer = useAuthStore((state) => state.status === 'authenticated' && state.role === 'client');
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{ orderNumber?: string; phone?: string }>({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackOrderResult | null>(null);

  const submit = async () => {
    const input = { orderNumber, phone };
    const localErrors = validateTrackInput(input);
    setErrors(localErrors);
    setSubmitError('');
    if (Object.keys(localErrors).length) return;
    setLoading(true);
    try {
      setResult(await ordersApi.trackOrder(buildTrackParams(input)));
    } catch (error) {
      setResult(null);
      setSubmitError(describeTrackError(normalizeApiError(error)));
    } finally {
      setLoading(false);
    }
  };

  const summary = result ? summarizeTracking(result) : null;

  return (
    <AppScreen title="تتبع طلب" subtitle="أدخل رقم الطلب ورقم الهاتف المسجل عليه لعرض حالته.">
      <AppCard style={styles.card}>
        <AppInput
          label="رقم الطلب"
          value={orderNumber}
          onChangeText={(value) => { setOrderNumber(value); if (errors.orderNumber) setErrors((c) => ({ ...c, orderNumber: undefined })); }}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="KH-2026-000123"
          error={errors.orderNumber}
        />
        <AppInput
          label="رقم الهاتف"
          value={phone}
          onChangeText={(value) => { setPhone(value); if (errors.phone) setErrors((c) => ({ ...c, phone: undefined })); }}
          keyboardType="phone-pad"
          placeholder={PHONE_PLACEHOLDER}
          hint={PHONE_FORMAT_HINT_AR}
          error={errors.phone}
        />
        {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
        <AppButton label="عرض حالة الطلب" onPress={() => void submit()} loading={loading} />
      </AppCard>

      {result && summary ? (
        <View style={styles.stack}>
          <AppCard>
            <Text style={styles.orderNumber}>{summary.orderNumber}</Text>
            <Text style={styles.label}>الحالة الحالية</Text>
            <StatusBadge status={result.status} />
            <Text style={styles.muted}>لا تُعرض الملاحظات الداخلية أو المستندات الخاصة في صفحة التتبع العامة.</Text>
          </AppCard>

          {summary.missingDocuments.length ? (
            <AppCard style={styles.warningCard}>
              <Text style={styles.warningTitle}>مطلوب منك</Text>
              {summary.missingDocuments.map((name, index) => (
                <Text key={`${name}-${index}`} style={styles.item}>• {name}</Text>
              ))}
              {isCustomer ? (
                <AppButton label="ارفع المستندات المطلوبة" onPress={() => navigation.navigate('ClientOrderDetail', { orderId: result.id })} />
              ) : (
                <>
                  <Text style={styles.muted}>لرفع المستندات المطلوبة سجّل الدخول إلى حسابك الذي أُرسل منه الطلب.</Text>
                  <AppButton label="سجّل الدخول لرفع المستندات" onPress={() => navigation.navigate('Login')} />
                </>
              )}
            </AppCard>
          ) : null}

          {summary.finalDocumentsCount ? (
            <AppCard>
              <Text style={styles.label}>النتيجة النهائية جاهزة</Text>
              <Text style={styles.muted}>
                {isCustomer ? 'يمكنك تنزيلها من تفاصيل الطلب.' : 'سجّل الدخول إلى حسابك لتنزيل النتيجة النهائية.'}
              </Text>
              <AppButton
                label={isCustomer ? 'فتح تفاصيل الطلب' : 'تسجيل الدخول'}
                variant="secondary"
                onPress={() => (isCustomer ? navigation.navigate('ClientOrderDetail', { orderId: result.id }) : navigation.navigate('Login'))}
              />
            </AppCard>
          ) : null}

          <OrderTimeline logs={summary.timeline} />
        </View>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing.lg },
  stack: { gap: theme.spacing.md },
  orderNumber: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.extraBold,
    fontSize: theme.typography.size.xl,
    textAlign: 'right',
  },
  label: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.md,
    textAlign: 'right',
  },
  muted: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    textAlign: 'right',
  },
  warningCard: {
    borderColor: theme.colors.warning,
    backgroundColor: '#fffbeb',
  },
  warningTitle: {
    color: '#92400e',
    fontFamily: theme.typography.fontFamily.extraBold,
    fontSize: theme.typography.size.md,
    textAlign: 'right',
  },
  item: {
    color: '#92400e',
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
  error: {
    color: theme.colors.danger,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
});
