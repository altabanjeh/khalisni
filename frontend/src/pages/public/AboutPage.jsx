import { Building2, CheckCircle2, ShieldCheck } from 'lucide-react'
import { PublicCard, PublicHero, PublicPageShell, PublicPanel } from '../../components/public/PublicPage'
import { useLanguage } from '../../context/LanguageContext'

function AboutPage() {
  const { isArabic } = useLanguage()

  const cards = [
    {
      icon: Building2,
      title: isArabic ? 'منصة أردنية' : 'Jordanian platform',
      text: isArabic ? 'نركز على تبسيط رحلة المعاملات الحكومية والإدارية للأفراد والمنشآت.' : 'Focused on simplifying government and administrative requests for individuals and businesses.',
    },
    {
      icon: CheckCircle2,
      title: isArabic ? 'مسار موحد' : 'One request flow',
      text: isArabic ? 'طلب موحد، رفع آمن للوثائق، ومتابعة واضحة للحالة من مكان واحد.' : 'One request flow, secure document upload, and clear status tracking from one place.',
    },
    {
      icon: ShieldCheck,
      title: isArabic ? 'تشغيل منظم' : 'Organized operations',
      text: isArabic ? 'إدارة داخلية منظمة للفرق ومزودي الخدمة للحفاظ على جودة التنفيذ.' : 'Structured operations for teams and service providers to keep execution quality visible.',
    },
  ]

  return (
    <PublicPageShell>
      <PublicHero
        eyebrow={isArabic ? 'من نحن' : 'About us'}
        icon={Building2}
        title={isArabic ? 'مهمة خالصني' : 'The Khalsni mission'}
        description={isArabic ? 'خالصني منصة أردنية تبسط المعاملات الحكومية والإدارية وتقلل الوقت والاحتكاك والتشتت بين القنوات المختلفة.' : 'Khalsni is a Jordanian platform that simplifies government and administrative requests while reducing time, friction, and fragmented channels.'}
      />

      <PublicPanel>
        <p className="max-w-5xl text-base font-semibold leading-8 text-white/60">
          {isArabic
            ? 'هدفنا هو أن تصبح رحلة الطلب واضحة من البداية إلى النهاية: اختيار الخدمة، فهم المتطلبات، رفع المستندات، متابعة الحالة، واستلام النتيجة من دون الحاجة للتنقل بين أكثر من قناة.'
            : 'Our goal is to make the request journey clear from start to finish: choosing the service, understanding requirements, uploading documents, tracking status, and receiving the final result without moving across disconnected channels.'}
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {cards.map(({ icon: Icon, title, text }) => (
            <PublicCard key={title}>
              <Icon className="h-8 w-8 text-[var(--khalsni-public-primary)]" />
              <h2 className="mt-4 text-lg font-extrabold text-white">{title}</h2>
              <p className="mt-3 text-sm font-semibold leading-7 text-white/60">{text}</p>
            </PublicCard>
          ))}
        </div>
      </PublicPanel>
    </PublicPageShell>
  )
}

export default AboutPage
