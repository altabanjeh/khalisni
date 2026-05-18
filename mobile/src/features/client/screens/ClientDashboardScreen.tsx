import { Image, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';

import { AppButton } from '../../../components/AppButton';
import { AppCard } from '../../../components/AppCard';
import { AppScreen } from '../../../components/AppScreen';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { LoadingState } from '../../../components/LoadingState';
import { MetricCard } from '../../../components/MetricCard';
import { OrderCard } from '../../../components/OrderCard';
import { PublicAdvertisementCard } from '../../../components/public/PublicAdvertisementCard';
import { PublicServiceCard } from '../../../components/public/PublicServiceCard';
import { notificationsApi } from '../../../api/notifications.api';
import { ordersApi } from '../../../api/orders.api';
import { publicSiteApi } from '../../../api/publicSite.api';
import { servicesApi } from '../../../api/services.api';
import { getDisplayError } from '../../../api/client';
import { theme } from '../../../theme';
import type { PublicSiteTheme } from '../../../types/publicSite';

function getPalette(publicTheme?: PublicSiteTheme) {
  return {
    primary: publicTheme?.primary_color || theme.colors.publicHeroStart,
    secondary: publicTheme?.secondary_color || theme.colors.publicHeroEnd,
    footer: publicTheme?.footer_background_color || theme.colors.publicFooter,
  };
}

export function ClientDashboardScreen({ navigation }: { navigation: any }) {
  const homepageQuery = useQuery({ queryKey: ['public-homepage'], queryFn: () => publicSiteApi.getHomepage() });
  const publicThemeQuery = useQuery({ queryKey: ['public-theme'], queryFn: () => publicSiteApi.getTheme() });
  const servicesQuery = useQuery({ queryKey: ['services'], queryFn: () => servicesApi.getServices() });
  const ordersQuery = useQuery({ queryKey: ['client-orders'], queryFn: () => ordersApi.getCustomerOrders() });
  const notificationsQuery = useQuery({ queryKey: ['client-notifications'], queryFn: () => notificationsApi.getNotifications() });

  const isLoading = homepageQuery.isLoading || servicesQuery.isLoading || ordersQuery.isLoading;
  const hasError = homepageQuery.isError || servicesQuery.isError || ordersQuery.isError;

  if (isLoading) {
    return <LoadingState />;
  }

  if (hasError) {
    return (
      <ErrorState
        message={getDisplayError(homepageQuery.error ?? servicesQuery.error ?? ordersQuery.error)}
        onRetry={() => {
          homepageQuery.refetch();
          publicThemeQuery.refetch();
          servicesQuery.refetch();
          ordersQuery.refetch();
          notificationsQuery.refetch();
        }}
      />
    );
  }

  const content = homepageQuery.data?.content;
  const advertisements = homepageQuery.data?.advertisements ?? [];
  const importantAlert = homepageQuery.data?.important_alert;
  const services = servicesQuery.data ?? [];
  const featuredServices = services.filter((service) => service.is_featured).slice(0, 3);
  const serviceShowcase = featuredServices.length ? featuredServices : services.slice(0, 3);
  const orders = ordersQuery.data ?? [];
  const activeOrders = orders.filter((item) => !['COMPLETED', 'REJECTED', 'CANCELLED', 'ARCHIVED'].includes(item.status));
  const waitingDocuments = orders.filter((item) => item.status === 'WAITING_CUSTOMER').length;
  const unreadNotifications = notificationsQuery.data?.filter((item) => !item.is_read).length ?? 0;
  const palette = getPalette(publicThemeQuery.data);

  const handlePublicAction = async (url?: string | null) => {
    if (!url) return;

    if (url.startsWith('/services')) {
      navigation.navigate('ServiceList');
      return;
    }

    if (url.startsWith('/create-order')) {
      const match = url.match(/service=(\d+)/);
      if (match) {
        navigation.navigate('CreateOrder', { serviceId: Number(match[1]) });
      } else {
        navigation.navigate('ServiceList');
      }
      return;
    }

    if (url.startsWith('/track-order')) {
      navigation.navigate('MyOrders');
      return;
    }

    if (/^(https?:|mailto:|tel:)/i.test(url)) {
      await Linking.openURL(url);
    }
  };

  return (
    <AppScreen refreshing={ordersQuery.isRefetching} onRefresh={ordersQuery.refetch}>
      <View style={styles.wrapper}>
        {importantAlert ? (
          <AppCard style={[styles.alertCard, { backgroundColor: importantAlert.background_color || '#fff7d6' }]}>
            <Text style={[styles.alertTitle, { color: importantAlert.text_color || theme.colors.text }]}>
              {importantAlert.title_ar || importantAlert.title_en}
            </Text>
            <Text style={[styles.alertDescription, { color: importantAlert.text_color || theme.colors.text }]}>
              {importantAlert.description_ar || importantAlert.description_en}
            </Text>
            {importantAlert.button_url ? (
              <AppButton
                label={importantAlert.button_text_ar || importantAlert.button_text_en || 'عرض'}
                onPress={() => void handlePublicAction(importantAlert.button_url)}
                variant="secondary"
              />
            ) : null}
          </AppCard>
        ) : null}

        <LinearGradient colors={[palette.primary, palette.secondary]} style={styles.hero}>
          <View style={styles.heroContent}>
            <View style={styles.heroHeader}>
              {publicThemeQuery.data?.logo_url ? <Image source={{ uri: publicThemeQuery.data.logo_url }} style={styles.logo} /> : null}
              <Text style={styles.heroBrand}>Khalisni / خلصني</Text>
            </View>
            <Text style={styles.heroTitle}>{content?.hero_title_ar || content?.hero_title_en || 'منصة خدمات حكومية بأسلوب واضح وسريع'}</Text>
            <Text style={styles.heroSubtitle}>
              {content?.hero_subtitle_ar || content?.hero_subtitle_en || 'اختر الخدمة المناسبة، ارفع الوثائق، وتابع حالة الطلب من الجوال.'}
            </Text>
            <View style={styles.heroActions}>
              <AppButton
                label={content?.primary_button_text || 'ابدأ الآن'}
                onPress={() => void handlePublicAction(content?.primary_button_url || '/services')}
                style={styles.heroAction}
              />
              <AppButton
                label={content?.secondary_button_text || 'كل الخدمات'}
                onPress={() => navigation.navigate('ServiceList')}
                style={styles.heroAction}
                variant="secondary"
              />
            </View>
            {content?.hero_image_url ? <Image source={{ uri: content.hero_image_url }} style={styles.heroImage} /> : null}
          </View>
        </LinearGradient>

        <View style={styles.metricsGrid}>
          <MetricCard label="الخدمات المتاحة" value={services.length} />
          <MetricCard label="الطلبات النشطة" value={activeOrders.length} />
        </View>
        <View style={styles.metricsGrid}>
          <MetricCard label="نواقص بانتظارك" value={waitingDocuments} />
          <MetricCard label="إشعارات غير مقروءة" value={unreadNotifications} />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>الخدمات المميزة</Text>
              <Text style={styles.sectionTitle}>ابدأ من أكثر الخدمات طلباً</Text>
            </View>
            <AppButton label="كل الخدمات" onPress={() => navigation.navigate('ServiceList')} variant="ghost" />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {serviceShowcase.map((service) => (
              <View key={service.id} style={styles.horizontalCard}>
                <PublicServiceCard
                  service={service}
                  onPress={() => navigation.navigate('ServiceDetail', { slug: service.slug })}
                  onPrimaryAction={() => navigation.navigate('CreateOrder', { serviceId: service.id, slug: service.slug })}
                  primaryLabel="طلب الخدمة"
                />
              </View>
            ))}
          </ScrollView>
        </View>

        {advertisements.length ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>الإعلانات والتنبيهات</Text>
                <Text style={styles.sectionTitle}>محتوى ترويجي وتحديثات عامة</Text>
              </View>
            </View>
            <View style={styles.stack}>
              {advertisements.slice(0, 3).map((advertisement) => (
                <PublicAdvertisementCard
                  key={advertisement.id || advertisement.advertisement_id}
                  advertisement={advertisement}
                  compact
                  onPressAction={
                    advertisement.button_url ? () => void handlePublicAction(advertisement.button_url) : undefined
                  }
                />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.featureGrid}>
            <AppCard>
              <Text style={styles.featureTitle}>سريع وواضح</Text>
              <Text style={styles.featureText}>نفس منطق الموقع، لكن بترتيب مبسط يناسب الجوال ويختصر خطواتك اليومية.</Text>
            </AppCard>
            <AppCard>
              <Text style={styles.featureTitle}>وثائقك محمية</Text>
              <Text style={styles.featureText}>إدارة المستندات والطلبات مرتبطة بنفس النظام الحالي وصلاحياته بدون تغيير في القواعد.</Text>
            </AppCard>
            <AppCard>
              <Text style={styles.featureTitle}>تشغيل احترافي</Text>
              <Text style={styles.featureText}>الطلبات، الإشعارات، والخطوات التشغيلية تظهر لك مباشرة من نفس البيانات المعتمدة على الويب.</Text>
            </AppCard>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>تواصل معنا</Text>
              <Text style={styles.sectionTitle}>قنوات الدعم العامة</Text>
            </View>
          </View>
          <View style={styles.stack}>
            <AppCard variant="muted">
              <Text style={styles.contactLabel}>الهاتف</Text>
              <Text style={styles.contactValue}>{content?.contact_phone || 'غير متوفر'}</Text>
            </AppCard>
            <AppCard variant="muted">
              <Text style={styles.contactLabel}>واتساب</Text>
              <Text style={styles.contactValue}>{content?.whatsapp_number || 'غير متوفر'}</Text>
            </AppCard>
            <AppCard variant="muted">
              <Text style={styles.contactLabel}>البريد الإلكتروني</Text>
              <Text style={styles.contactValue}>{content?.email || 'غير متوفر'}</Text>
            </AppCard>
            <AppCard variant="muted">
              <Text style={styles.contactLabel}>العنوان</Text>
              <Text style={styles.contactValue}>{content?.office_address || 'غير متوفر'}</Text>
            </AppCard>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>طلباتك</Text>
              <Text style={styles.sectionTitle}>آخر الطلبات والمتابعة</Text>
            </View>
            {orders.length ? (
              <AppButton label="عرض الكل" onPress={() => navigation.navigate('MyOrders')} variant="ghost" />
            ) : null}
          </View>
          {orders.length ? (
            <View style={styles.stack}>
              {orders.slice(0, 3).map((order) => (
                <OrderCard key={order.id} order={order} onPress={() => navigation.navigate('ClientOrderDetail', { orderId: order.id })} />
              ))}
            </View>
          ) : (
            <EmptyState
              title="لا توجد طلبات بعد"
              description="ابدأ بطلب خدمة من القائمة الحالية."
              actionLabel="استعراض الخدمات"
              onAction={() => navigation.navigate('ServiceList')}
            />
          )}
        </View>

        <AppCard style={[styles.footerCard, { backgroundColor: palette.footer }]}>
          <Text style={styles.footerText}>{content?.footer_text || 'خدمة حكومية رقمية بواجهة موحدة على الويب والجوال.'}</Text>
        </AppCard>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: theme.spacing.lg,
  },
  alertCard: {
    gap: theme.spacing.sm,
  },
  alertTitle: {
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.md,
    textAlign: 'right',
  },
  alertDescription: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    textAlign: 'right',
  },
  hero: {
    borderRadius: theme.spacing.radiusLg,
    overflow: 'hidden',
  },
  heroContent: {
    gap: theme.spacing.md,
    padding: theme.spacing.section,
  },
  heroHeader: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: theme.spacing.sm,
  },
  logo: {
    borderRadius: theme.spacing.radiusMd,
    height: 42,
    width: 42,
  },
  heroBrand: {
    color: theme.colors.textInverse,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.md,
    textAlign: 'right',
  },
  heroTitle: {
    color: theme.colors.textInverse,
    fontFamily: theme.typography.fontFamily.extraBold,
    fontSize: theme.typography.size.display,
    lineHeight: theme.typography.lineHeight.display,
    textAlign: 'right',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.86)',
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.md,
    lineHeight: theme.typography.lineHeight.md,
    textAlign: 'right',
  },
  heroActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  heroAction: {
    flex: 1,
  },
  heroImage: {
    borderRadius: theme.spacing.radiusMd,
    height: 220,
    width: '100%',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  section: {
    gap: theme.spacing.md,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  sectionEyebrow: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
  sectionTitle: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.extraBold,
    fontSize: theme.typography.size.xl,
    textAlign: 'right',
  },
  horizontalList: {
    gap: theme.spacing.md,
  },
  horizontalCard: {
    width: 292,
  },
  stack: {
    gap: theme.spacing.md,
  },
  featureGrid: {
    gap: theme.spacing.md,
  },
  featureTitle: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.lg,
    textAlign: 'right',
  },
  featureText: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    textAlign: 'right',
  },
  contactLabel: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
  contactValue: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.md,
    textAlign: 'right',
  },
  footerCard: {
    gap: 0,
  },
  footerText: {
    color: theme.colors.textInverse,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
});
