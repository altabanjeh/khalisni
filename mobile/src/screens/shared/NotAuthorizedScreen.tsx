import { AppScreen } from '../../components/AppScreen';
import { EmptyState } from '../../components/EmptyState';

export function NotAuthorizedScreen() {
  return (
    <AppScreen title="غير مصرح" subtitle="تم إخفاء هذه الشاشة لأن صلاحياتك الحالية لا تسمح بها.">
      <EmptyState
        title="الوصول غير متاح"
        description="إذا كان هذا غير متوقع، راجع مسؤول النظام أو حدّث جلسة الدخول."
      />
    </AppScreen>
  );
}
