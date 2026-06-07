import clsx from 'clsx'
import { useLanguage } from '../context/LanguageContext'

function LanguageSwitcher({ className = '', light = false }) {
  const { language, setLanguage, t } = useLanguage()

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border px-1 py-1',
        light ? 'border-white/20 bg-white/10 text-white' : 'border-border bg-white text-ink',
        className,
      )}
    >
      {[
        { value: 'ar', label: t('language.ar', 'العربية') },
        { value: 'en', label: t('language.en', 'English') },
      ].map((option) => {
        const active = language === option.value

        return (
          <button
            key={option.value}
            className={clsx(
              'rounded-full px-3 py-1.5 text-xs font-semibold transition',
              active
                ? light
                  ? 'bg-white text-ink'
                  : 'bg-brand-600 text-white'
                : light
                  ? 'text-white/80 hover:bg-white/10 hover:text-white'
                  : 'text-slate-600 hover:bg-brand-50 hover:text-ink',
            )}
            onClick={() => setLanguage(option.value)}
            type="button"
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export default LanguageSwitcher
