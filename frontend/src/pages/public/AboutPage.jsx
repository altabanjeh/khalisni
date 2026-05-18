import { useLanguage } from '../../context/LanguageContext'

function AboutPage() {
  const { isArabic } = useLanguage()

  return (
    <div className="glass-panel p-6">
      <p className="text-sm font-bold text-brand-700">{isArabic ? 'من نحن' : 'About us'}</p>
      <h1 className="mt-2 text-3xl font-extrabold text-ink">{isArabic ? 'مهمة Khalisni' : 'The Khalisni mission'}</h1>
      <p className="mt-6 max-w-4xl text-sm leading-8 text-slate-600">
        {isArabic
          ? 'خلصني منصة أردنية تركز على تبسيط رحلة المعاملات الحكومية والإدارية للأفراد والمنشآت. هدفنا هو تقليل الوقت والاحتكاك والتشتت بين المنصات المختلفة، عبر طلب موحد، رفع آمن للوثائق، متابعة حالة واضحة، وتشغيل داخلي منظم للإدارة ومزوّدي الخدمة.'
          : 'Khalisni is a Jordanian platform focused on simplifying government and administrative requests for individuals and businesses. Our goal is to reduce time, friction, and fragmentation across different channels through one request flow, secure document upload, clear status tracking, and organized internal operations for admins and service providers.'}
      </p>
    </div>
  )
}

export default AboutPage
