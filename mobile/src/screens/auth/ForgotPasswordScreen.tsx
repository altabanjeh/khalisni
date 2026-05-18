import { AppCard } from '../../components/AppCard';
import { AppScreen } from '../../components/AppScreen';
import { EmptyState } from '../../components/EmptyState';

export function ForgotPasswordScreen() {
  return (
    <AppScreen title="استعادة كلمة المرور" subtitle="هذه الشاشة جاهزة على مستوى الواجهة، لكن الـ backend الحالي لا يوفّر endpoint لإرسال روابط الاستعادة.">
      <AppCard>
        <EmptyState
          title="الواجهة جاهزة"
          description="يلزم إضافة API خاص بـ forgot/reset password قبل تفعيل هذا التدفق فعلياً."
        />
      </AppCard>
    </AppScreen>
  );
}
