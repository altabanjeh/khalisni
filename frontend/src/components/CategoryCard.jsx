import { ArrowUpRight, Boxes } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { ImageFallback, PublicCard } from './public/PublicPage'
import { getCategoryDescription, getCategoryName } from '../utils/servicePresentation'

function CategoryCard({ category, count }) {
  const { language, isArabic } = useLanguage()
  const name = getCategoryName(category, language, isArabic ? 'تصنيف خدمات' : 'Service category')
  const description = getCategoryDescription(category, language, isArabic ? 'خدمات مرتبطة بهذا التصنيف.' : 'Services grouped under this category.')
  const href = category?.slug ? `/services/category/${category.slug}` : '/services'
  const imageUrl = category?.image_url || category?.image
  const serviceCount = count ?? category?.service_count ?? 0

  return (
    <PublicCard
      as={Link}
      className="group flex h-full min-h-[20rem] snap-start flex-col p-0 focus:outline-none sm:min-h-0"
      interactive
      to={href}
    >
      <ImageFallback
        alt={name}
        className="aspect-[16/10] w-full border-b border-[var(--khalsni-public-border)]"
        icon={Boxes}
        src={imageUrl}
      />

      <div className="flex flex-1 flex-col p-5 text-start">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--khalsni-public-primary-soft)] px-3 py-1 text-xs font-extrabold text-[var(--khalsni-public-primary)]">
            <Boxes aria-hidden="true" className="h-4 w-4" />
            {isArabic ? 'تصنيف' : 'Category'}
          </span>
          <span className="text-xs font-bold text-[var(--khalsni-public-text-secondary)]">
            {serviceCount} {isArabic ? 'خدمة' : 'services'}
          </span>
        </div>

        <h3 className="text-xl font-extrabold leading-8 text-[var(--khalsni-public-navy)]">{name}</h3>
        <p className="mt-2 line-clamp-3 text-sm font-semibold leading-7 text-[var(--khalsni-public-text-secondary)]">{description}</p>

        <span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-extrabold text-[var(--khalsni-public-primary)]">
          {isArabic ? 'عرض التصنيف' : 'Open category'}
          <ArrowUpRight aria-hidden="true" className="h-4 w-4 rtl:-scale-x-100" />
        </span>
      </div>
    </PublicCard>
  )
}

export default CategoryCard
