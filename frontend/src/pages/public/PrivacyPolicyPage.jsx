import { useLanguage } from '../../context/LanguageContext'

function PrivacyPolicyPage() {
  const { isArabic } = useLanguage()
  const paragraphs = isArabic
    ? [
        'تستخدم خلصني بيانات العميل ووثائقه فقط لغرض تنفيذ الخدمة المطلوبة والتواصل التشغيلي المرتبط بها.',
        'الوصول إلى الوثائق محمي بصلاحيات حسب الدور، ولا يتم توفير روابط تنزيل عامة غير مصرح بها.',
        'يتم تسجيل العمليات الحساسة إدارياً لأغراض التدقيق والجودة والمتابعة التشغيلية.',
        'يمكن للعميل تحديث بياناته الأساسية وطلب المساعدة عبر قنوات الدعم المعتمدة.',
      ]
    : [
        'Khalisni uses customer data and documents only to deliver the requested service and the related operational communication.',
        'Access to documents is protected by role-based permissions, and unauthorized public download links are not provided.',
        'Sensitive actions are logged for audit, quality assurance, and operational follow-up purposes.',
        'Customers can update their core details and request assistance through the approved support channels.',
      ]

  return (
    <div className="glass-panel p-6">
      <p className="text-sm font-bold text-brand-700">{isArabic ? 'سياسة الخصوصية' : 'Privacy policy'}</p>
      <h1 className="mt-2 text-3xl font-extrabold text-ink">{isArabic ? 'كيف نتعامل مع بياناتك ووثائقك' : 'How we handle your data and documents'}</h1>
      <div className="mt-6 space-y-4 text-sm leading-8 text-slate-600">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </div>
  )
}

export default PrivacyPolicyPage
