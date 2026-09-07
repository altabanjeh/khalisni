import { ArrowUpRight, Boxes } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { ImageFallback, PublicCard } from './public/PublicPage'
import { getCategoryDescription, getCategoryName } from '../utils/servicePresentation'

function CategoryCard({ category, count }) {
  const { language, isArabic } = useLanguage()
  const name = getCategoryName(category, language, isArabic ? 'تصنيف خدمات' : 'Service category')
  const description = getCategoryDescription(category, language, '')
  const href = category?.slug ? `/services/category/${category.slug}` : '/services'
  const imageUrl = category?.image_url || category?.image
  const serviceCount = count ?? category?.service_count
  const hasServiceCount = serviceCount != null && serviceCount !== ''

  return (
    <PublicCard
      as={Link}
      className="group flex h-full min-h-[18rem] snap-start flex-col p-0 focus:outline-none"
      interactive
      to={href}
    >
      <ImageFallback
        alt={name}
        className="aspect-[16/10] w-full border-b border-[var(--khalsni-public-border)]"
        icon={Boxes}
        src={imageUrl}
      />

      <div className="flex flex-1 flex-col p-4 text-start sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--khalsni-public-primary-soft)] px-3 py-1 text-xs font-extrabold text-[var(--khalsni-public-accent-text)]">
            <Boxes aria-hidden="true" className="h-4 w-4" />
            {isArabic ? 'تصنيف' : 'Category'}
          </span>
          {hasServiceCount ? (
            <span className="text-xs font-bold text-[var(--khalsni-public-text-secondary)]">
              {serviceCount} {isArabic ? 'خدمة' : 'services'}
            </span>
          ) : null}
        </div>

        <h3 className="text-lg font-extrabold leading-7 text-[var(--khalsni-public-navy)] sm:text-xl">{name}</h3>
        {description ? <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-[var(--khalsni-public-text-secondary)]">{description}</p> : null}

        <span className="mt-auto inline-flex items-center gap-2 pt-4 text-sm font-extrabold text-[var(--khalsni-public-accent-text)]">
          {isArabic ? 'عرض التصنيف' : 'Open category'}
          <ArrowUpRight aria-hidden="true" className="h-4 w-4 rtl:-scale-x-100" />
        </span>
      </div>
    </PublicCard>
  )
}

export default CategoryCard
