import { ShieldCheck } from 'lucide-react'
import { PublicHero, PublicPageShell, PublicPanel } from '../../components/public/PublicPage'
import { useLanguage } from '../../context/LanguageContext'

function PrivacyPolicyPage() {
  const { isArabic } = useLanguage()
  const paragraphs = isArabic
    ? [
        'تستخدم خالصني بيانات العميل ووثائقه فقط لغرض تنفيذ الخدمة المطلوبة والتواصل التشغيلي المرتبط بها.',
        'الوصول إلى الوثائق محمي بصلاحيات حسب الدور، ولا يتم توفير روابط تنزيل عامة غير مصرح بها.',
        'يتم تسجيل العمليات الحساسة إداريا لأغراض التدقيق والجودة والمتابعة التشغيلية.',
        'يمكن للعميل تحديث بياناته الأساسية وطلب المساعدة عبر قنوات الدعم المعتمدة.',
      ]
    : [
        'Khalsni uses customer data and documents only to deliver the requested service and the related operational communication.',
        'Access to documents is protected by role-based permissions, and unauthorized public download links are not provided.',
        'Sensitive actions are logged for audit, quality assurance, and operational follow-up purposes.',
        'Customers can update their core details and request assistance through the approved support channels.',
      ]

  return (
    <PublicPageShell>
      <PublicHero
        eyebrow={isArabic ? 'سياسة الخصوصية' : 'Privacy policy'}
        icon={ShieldCheck}
        title={isArabic ? 'كيف نتعامل مع بياناتك ووثائقك' : 'How we handle your data and documents'}
        description={isArabic ? 'توضح هذه الصفحة المبادئ العامة لحماية بيانات الطلبات والمستندات داخل خالصني.' : 'This page outlines the general principles for protecting request data and documents inside Khalsni.'}
      />

      <PublicPanel>
        <div className="space-y-4 text-sm font-semibold leading-8 text-slate-600">
          {paragraphs.map((paragraph, index) => (
            <div key={paragraph} className="flex gap-4 rounded-[var(--radius-lg)] border border-[var(--khalsni-public-border)] bg-slate-50 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--khalsni-public-primary)] text-sm font-extrabold text-white">{index + 1}</span>
              <p>{paragraph}</p>
            </div>
          ))}
        </div>
      </PublicPanel>
    </PublicPageShell>
  )
}

export default PrivacyPolicyPage
