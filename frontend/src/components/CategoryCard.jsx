import { ArrowUpRight, Boxes } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { getCategoryDescription, getCategoryName } from '../utils/servicePresentation'

function CategoryCard({ category, count }) {
  const { language, isArabic } = useLanguage()
  const name = getCategoryName(category, language, isArabic ? 'تصنيف خدمات' : 'Service category')
  const description = getCategoryDescription(category, language, isArabic ? 'خدمات مرتبطة بهذا التصنيف.' : 'Services grouped under this category.')
  const href = category?.slug ? `/services/category/${category.slug}` : '/services'
  const color = category?.color || 'var(--khalsni-public-primary)'
  const imageUrl = category?.image_url || category?.image

  return (
    <Link
      className="group relative flex min-h-[14rem] overflow-hidden rounded-[var(--radius-xl)] border border-[var(--khalsni-public-border)] bg-white shadow-soft transition duration-300 hover:-translate-y-1 hover:border-[var(--khalsni-public-primary)]/50 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
      to={href}
    >
      {imageUrl ? (
        <img alt="" className="absolute inset-0 h-full w-full object-cover opacity-[0.18] transition duration-500 group-hover:scale-105" loading="lazy" src={imageUrl} />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, color-mix(in srgb, ${color} 12%, var(--khalsni-public-surface)) 0%, var(--khalsni-public-bg-secondary) 100%)`,
          }}
        />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(247,250,255,0.96))]" />
      <div className="relative flex min-h-full w-full flex-col justify-between p-5 text-right text-ink">
        <div className="flex items-center justify-between gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full border border-brand-100 bg-brand-50 text-[var(--khalsni-public-primary)]">
            <Boxes className="h-5 w-5" />
          </span>
          <span className="rounded-full border border-[var(--khalsni-public-border)] bg-white px-3 py-1 text-xs font-bold text-slate-600 backdrop-blur">
            {count ?? category?.service_count ?? 0} {isArabic ? 'خدمة' : 'services'}
          </span>
        </div>

        <div>
          <h3 className="text-2xl font-extrabold leading-8">{name}</h3>
          <p className="mt-3 line-clamp-3 text-sm font-semibold leading-7 text-slate-600">{description}</p>
          <div className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-[var(--khalsni-public-primary)]">
            {isArabic ? 'عرض التصنيف' : 'Open category'}
            <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </Link>
  )
}

export default CategoryCard
