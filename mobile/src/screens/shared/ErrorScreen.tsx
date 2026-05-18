import { AppScreen } from '../../components/AppScreen';
import { ErrorState } from '../../components/ErrorState';

export function ErrorScreen({ route }: { route?: { params?: { message?: string } } }) {
  return (
    <AppScreen title="حدث خطأ">
      <ErrorState message={route?.params?.message ?? 'تعذر إكمال العملية المطلوبة.'} />
    </AppScreen>
  );
}
