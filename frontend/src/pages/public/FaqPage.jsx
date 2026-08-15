import { HelpCircle } from 'lucide-react'
import { PublicCard, PublicHero, PublicPageShell } from '../../components/public/PublicPage'
import { useLanguage } from '../../context/LanguageContext'

const faqItems = {
  ar: [
    { q: 'هل يجب أن أزور الجهة الحكومية بنفسي؟', a: 'يعتمد ذلك على نوع الخدمة، لكن خالصني يغطي المتابعة والتنسيق والرفع والتسليم قدر الإمكان.' },
    { q: 'كيف أعرف الوثائق المطلوبة؟', a: 'لكل خدمة صفحة تفاصيل توضح الوثائق المطلوبة والمدة المتوقعة والرسوم.' },
    { q: 'كيف أتابع حالة طلبي؟', a: 'من صفحة تتبع الطلب باستخدام رقم الطلب ورقم الهاتف، أو من لوحة العميل بعد تسجيل الدخول.' },
    { q: 'هل يمكنني رفع وثائق إضافية بعد إنشاء الطلب؟', a: 'نعم، عند طلب وثائق إضافية ستظهر لك إمكانية الرفع من لوحة العميل.' },
  ],
  en: [
    { q: 'Do I need to visit the government office myself?', a: 'It depends on the service, but Khalsni handles follow-up, coordination, submission, and delivery whenever possible.' },
    { q: 'How do I know which documents are required?', a: 'Each service has a details page listing the required documents, expected duration, and fees.' },
    { q: 'How can I track my order?', a: 'Use the order tracking page with your order number and phone number, or track it from the customer dashboard after signing in.' },
    { q: 'Can I upload extra documents after creating the order?', a: 'Yes. If additional documents are requested, you will be able to upload them from the customer dashboard.' },
  ],
}

function FaqPage() {
  const { isArabic } = useLanguage()
  const items = faqItems[isArabic ? 'ar' : 'en']

  return (
    <PublicPageShell>
      <PublicHero
        eyebrow={isArabic ? 'الأسئلة الشائعة' : 'FAQ'}
        icon={HelpCircle}
        title={isArabic ? 'إجابات سريعة قبل البدء' : 'Quick answers before you start'}
        description={isArabic ? 'أهم الأسئلة حول طلب الخدمات، المستندات، والمتابعة من خالصني.' : 'Common questions about service requests, documents, and tracking with Khalsni.'}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((item, index) => (
          <PublicCard key={item.q} className="min-h-44">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[var(--khalsni-public-primary)] text-sm font-extrabold text-white">
              {String(index + 1).padStart(2, '0')}
            </span>
            <h2 className="mt-4 text-lg font-extrabold leading-7 text-ink">{item.q}</h2>
            <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">{item.a}</p>
          </PublicCard>
        ))}
      </div>
    </PublicPageShell>
  )
}

export default FaqPage
