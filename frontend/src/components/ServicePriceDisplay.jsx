import { WalletCards } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { getServicePublicPrice } from '../utils/servicePresentation'

function ServicePriceDisplay({ service, compact = false }) {
  const { language, isArabic } = useLanguage()
  const price = getServicePublicPrice(service, language)

  return (
    <div className={compact ? 'space-y-1' : 'rounded-2xl border border-border bg-slate-50/80 p-3'}>
      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
        <WalletCards className="h-4 w-4 text-brand-600" />
        {isArabic ? 'السعر' : 'Price'}
      </div>
      <p className="mt-2 text-sm font-semibold text-ink">
        {compact ? (isArabic ? 'راجع تفاصيل الرسوم في البطاقة الرئيسية' : 'See the fee details in the main card') : price.label}
      </p>
      {!compact && price.note && price.isKnown ? <p className="mt-1 text-xs leading-5 text-slate-500">{price.note}</p> : null}
    </div>
  )
}

export default ServicePriceDisplay
