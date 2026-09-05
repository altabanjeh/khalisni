import { Compass, Home, LifeBuoy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PublicHero, PublicLinkButton, PublicPageShell, PublicPanel } from '../../components/public/PublicPage'
import { useLanguage } from '../../context/LanguageContext'

function NotFoundPage() {
  const { isArabic } = useLanguage()

  return (
    <PublicPageShell>
      <PublicHero
        eyebrow={isArabic ? 'خطأ 404' : 'Error 404'}
        icon={Compass}
        title={isArabic ? 'الصفحة غير موجودة' : 'This page could not be found'}
        description={
          isArabic
            ? 'قد يكون الرابط قديماً أو غير صحيح. يمكنك العودة إلى الصفحة الرئيسية أو تصفح الخدمات المتاحة.'
            : 'The link may be outdated or incorrect. Head back to the homepage or browse the available services.'
        }
      />

      <PublicPanel>
        <div className="flex flex-col gap-3 sm:flex-row">
          <PublicLinkButton to="/">
            <Home aria-hidden="true" className="h-4 w-4" />
            {isArabic ? 'الصفحة الرئيسية' : 'Go to homepage'}
          </PublicLinkButton>
          <Link
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--khalsni-public-border)] px-5 py-3 text-sm font-bold text-[var(--khalsni-public-navy)] transition hover:bg-slate-50"
            to="/services"
          >
            <Compass aria-hidden="true" className="h-4 w-4" />
            {isArabic ? 'تصفح الخدمات' : 'Browse services'}
          </Link>
          <Link
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--khalsni-public-border)] px-5 py-3 text-sm font-bold text-[var(--khalsni-public-navy)] transition hover:bg-slate-50"
            to="/contact"
          >
            <LifeBuoy aria-hidden="true" className="h-4 w-4" />
            {isArabic ? 'تواصل معنا' : 'Contact support'}
          </Link>
        </div>
      </PublicPanel>
    </PublicPageShell>
  )
}

export default NotFoundPage
