import { ArrowUpRight, Boxes } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { PublicCard } from './public/PublicPage'
import { getCover } from '../utils/cover'
import { getCategoryDescription, getCategoryName } from '../utils/servicePresentation'

/**
 * Curated entry point into a service collection. Image-first: a real category
 * image when configured, otherwise a deterministic branded gradient cover with
 * a large glyph and the service count overlaid.
 */
function CategoryCard({ category, count }) {
  const { language, isArabic } = useLanguage()
  const name = getCategoryName(category, language, isArabic ? 'تصنيف خدمات' : 'Service category')
  const description = getCategoryDescription(category, language, '')
  const href = category?.slug ? `/services/category/${category.slug}` : '/services'
  const serviceCount = count ?? category?.service_count
  const hasServiceCount = serviceCount != null && serviceCount !== ''
  const cover = getCover(category, category?.slug || '')
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = cover.hasImage && !imageFailed

  return (
    <PublicCard
      as={Link}
      className="kh-interactive-card group flex h-full min-h-[16rem] snap-start flex-col overflow-hidden p-0 focus:outline-none"
      to={href}
    >
      <div className="kh-cover aspect-[16/10] w-full" style={showImage ? undefined : cover.style}>
        {showImage ? (
          <img
            alt={name}
            className="kh-card-image-zoom absolute inset-0 h-full w-full object-cover transition-transform duration-500"
            loading="lazy"
            onError={() => setImageFailed(true)}
            src={cover.imageUrl}
          />
        ) : (
          <>
            <span aria-hidden="true" className="kh-cover-pattern" />
            <Boxes aria-hidden="true" className="kh-cover-glyph kh-card-image-zoom transition-transform duration-500" />
          </>
        )}
        <div className="kh-cover-content flex h-full flex-col justify-between p-4">
          <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-white/95 px-2.5 py-1 text-[0.72rem] font-extrabold text-[var(--khalsni-public-navy)] shadow-sm ring-1 ring-black/5 backdrop-blur">
            <Boxes aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[var(--khalsni-public-accent-text)]" />
            {isArabic ? 'تصنيف' : 'Category'}
          </span>
          {hasServiceCount ? (
            <span className="self-start rounded-full bg-black/35 px-2.5 py-1 text-[0.72rem] font-extrabold text-white backdrop-blur">
              {serviceCount} {isArabic ? 'خدمة' : 'services'}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 text-start sm:p-5">
        <h3 className="text-lg font-extrabold leading-6 text-[var(--khalsni-public-navy)] sm:text-xl">{name}</h3>
        {description ? (
          <p className="mt-2 line-clamp-2 flex-1 text-sm font-semibold leading-6 text-[var(--khalsni-public-text-secondary)]">{description}</p>
        ) : (
          <span className="flex-1" />
        )}
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-extrabold text-[var(--khalsni-public-accent-text)]">
          {isArabic ? 'عرض التصنيف' : 'Open category'}
          <ArrowUpRight aria-hidden="true" className="h-4 w-4 rtl:-scale-x-100" />
        </span>
      </div>
    </PublicCard>
  )
}

export default CategoryCard
