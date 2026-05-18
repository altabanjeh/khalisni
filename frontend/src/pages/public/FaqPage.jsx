import { useLanguage } from '../../context/LanguageContext'

const faqItems = {
  ar: [
    { q: 'هل يجب أن أزور الجهة الحكومية بنفسي؟', a: 'يعتمد ذلك على نوع الخدمة، لكن خلصني يغطي المتابعة والتنسيق والرفع والتسليم قدر الإمكان.' },
    { q: 'كيف أعرف الوثائق المطلوبة؟', a: 'لكل خدمة صفحة تفاصيل توضح الوثائق المطلوبة والمدة المتوقعة والرسوم.' },
    { q: 'كيف أتابع حالة طلبي؟', a: 'من صفحة تتبع الطلب باستخدام رقم الطلب ورقم الهاتف، أو من لوحة العميل بعد تسجيل الدخول.' },
    { q: 'هل يمكنني رفع وثائق إضافية بعد إنشاء الطلب؟', a: 'نعم، عند طلب وثائق إضافية ستظهر لك إمكانية الرفع من لوحة العميل.' },
  ],
  en: [
    { q: 'Do I need to visit the government office myself?', a: 'It depends on the service, but Khalisni handles follow-up, coordination, submission, and delivery whenever possible.' },
    { q: 'How do I know which documents are required?', a: 'Each service has a details page listing the required documents, expected duration, and fees.' },
    { q: 'How can I track my order?', a: 'Use the order tracking page with your order number and phone number, or track it from the customer dashboard after signing in.' },
    { q: 'Can I upload extra documents after creating the order?', a: 'Yes. If additional documents are requested, you will be able to upload them from the customer dashboard.' },
  ],
}

function FaqPage() {
  const { isArabic } = useLanguage()
  const items = faqItems[isArabic ? 'ar' : 'en']

  return (
    <div className="space-y-4">
      <div className="glass-panel p-6">
        <p className="text-sm font-bold text-brand-700">{isArabic ? 'الأسئلة الشائعة' : 'FAQ'}</p>
        <h1 className="mt-2 text-3xl font-extrabold text-ink">{isArabic ? 'إجابات سريعة قبل البدء' : 'Quick answers before you start'}</h1>
      </div>
      {items.map((item) => (
        <div key={item.q} className="glass-panel p-6">
          <h2 className="text-lg font-bold text-ink">{item.q}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">{item.a}</p>
        </div>
      ))}
    </div>
  )
}

export default FaqPage
