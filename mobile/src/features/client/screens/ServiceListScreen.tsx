import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { AppButton } from '../../../components/AppButton';
import { AppCard } from '../../../components/AppCard';
import { AppInput } from '../../../components/AppInput';
import { AppScreen } from '../../../components/AppScreen';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { LoadingState } from '../../../components/LoadingState';
import { PublicServiceCard } from '../../../components/public/PublicServiceCard';
import { servicesApi } from '../../../api/services.api';
import { getDisplayError } from '../../../api/client';
import { theme } from '../../../theme';

export function ServiceListScreen({ navigation }: { navigation: any }) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const servicesQuery = useQuery({ queryKey: ['services'], queryFn: () => servicesApi.getServices() });
  const categoriesQuery = useQuery({ queryKey: ['service-categories'], queryFn: () => servicesApi.getCategories() });

  const filteredServices = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (servicesQuery.data ?? []).filter((service) => {
      const matchesSearch =
        !query ||
        service.name_ar?.toLowerCase().includes(query) ||
        service.name_en?.toLowerCase().includes(query) ||
        service.description_ar?.toLowerCase().includes(query);

      const matchesCategory =
        !activeCategory ||
        service.category?.slug === activeCategory ||
        service.category_name === activeCategory;

      return matchesSearch && matchesCategory;
    });
  }, [activeCategory, search, servicesQuery.data]);

  return (
    <AppScreen title="الخدمات" subtitle="اختر الخدمة المناسبة لمعاملتك من نفس الدليل المعروض على الموقع.">
      {servicesQuery.isLoading ? <LoadingState /> : null}
      {servicesQuery.isError ? <ErrorState message={getDisplayError(servicesQuery.error)} onRetry={servicesQuery.refetch} /> : null}

      {!servicesQuery.isLoading && !servicesQuery.isError ? (
        <>
          <AppCard style={styles.filterCard}>
            <Text style={styles.eyebrow}>دليل الخدمات</Text>
            <Text style={styles.heading}>ابحث واختر الخدمة المناسبة</Text>
            <AppInput label="ابحث بالاسم أو الوصف" value={search} onChangeText={setSearch} placeholder="اكتب اسم الخدمة أو الجهة" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
              <AppButton
                label="كل التصنيفات"
                onPress={() => setActiveCategory('')}
                variant={activeCategory ? 'secondary' : 'primary'}
              />
              {(categoriesQuery.data ?? []).map((category) => (
                <AppButton
                  key={category.id}
                  label={category.name_ar}
                  onPress={() => setActiveCategory(category.slug || category.name_ar)}
                  variant={activeCategory === (category.slug || category.name_ar) ? 'primary' : 'secondary'}
                />
              ))}
            </ScrollView>
          </AppCard>

          {filteredServices.length ? (
            <View style={styles.stack}>
              {filteredServices.map((service) => (
                <PublicServiceCard
                  key={service.id}
                  service={service}
                  onPress={() => navigation.navigate('ServiceDetail', { slug: service.slug })}
                  onPrimaryAction={() => navigation.navigate('CreateOrder', { serviceId: service.id, slug: service.slug })}
                  primaryLabel="طلب الخدمة"
                />
              ))}
            </View>
          ) : (
            <EmptyState title="لا توجد خدمات تطابق البحث" description="جرّب تغيير الكلمات المفتاحية أو إزالة التصنيف المحدد." />
          )}
        </>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  filterCard: {
    gap: theme.spacing.md,
  },
  eyebrow: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
  heading: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.extraBold,
    fontSize: theme.typography.size.xl,
    textAlign: 'right',
  },
  categoryRow: {
    gap: theme.spacing.sm,
  },
  stack: {
    gap: theme.spacing.md,
  },
});
