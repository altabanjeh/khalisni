import { BookOpenText } from 'lucide-react'
import { useEffect } from 'react'
import PageHeader from '../../components/PageHeader'
import { useLanguage } from '../../context/LanguageContext'

function ManualLaunchPage() {
  const { t } = useLanguage()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.dispatchEvent(new Event('khalisni:open-help'))
    }, 100)

    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div className="page-section space-y-6">
      <PageHeader
        icon={BookOpenText}
        title={t('manual.launchTitle', 'الدليل التشغيلي')}
        eyebrow={t('routes.manual', 'الدليل')}
        description={t(
          'manual.launchDescription',
          'تُفتح مكتبة الدليل تلقائياً من هذه الصفحة. استخدمها للبحث عن الشاشات، الخطوات اليومية، والصور التوضيحية الخاصة بدورك.',
        )}
      />

      <section className="glass-panel space-y-4 p-6">
        <h2 className="text-lg font-extrabold text-ink">{t('manual.launchTipTitle', 'نصائح سريعة')}</h2>
        <ul className="space-y-3 text-sm leading-7 text-slate-700">
          <li>{t('manual.launchTip1', 'ابحث باسم الشاشة أو الوظيفة مثل الطلبات أو الإعلانات أو المزوّدين.')}</li>
          <li>{t('manual.launchTip2', 'بدّل اللغة من الشريط العلوي لعرض النصوص المناسبة للمستخدم النهائي.')}</li>
          <li>{t('manual.launchTip3', 'افتح الدليل من أي شاشة للوصول مباشرةً إلى الإرشادات السياقية الخاصة بها.')}</li>
        </ul>
        <button className="btn-primary" onClick={() => window.dispatchEvent(new Event('khalisni:open-help'))} type="button">
          {t('manual.launchButton', 'فتح الدليل الآن')}
        </button>
      </section>
    </div>
  )
}

export default ManualLaunchPage
