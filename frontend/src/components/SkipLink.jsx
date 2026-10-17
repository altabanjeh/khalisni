import { useLanguage } from '../context/LanguageContext'

/**
 * "Skip to main content" link: visually hidden until it receives keyboard
 * focus, then moves focus to the page's <main> landmark (which carries
 * tabIndex={-1} so it can take focus).
 */
function SkipLink({ targetId = 'main-content' }) {
  const { isArabic } = useLanguage()

  function handleClick(event) {
    const target = document.getElementById(targetId)
    if (!target) return
    event.preventDefault()
    target.focus()
    target.scrollIntoView?.({ block: 'start' })
  }

  return (
    <a
      className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[100] focus:rounded-[var(--radius-md)] focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-[var(--kh-navy)] focus:shadow-panel focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[var(--kh-primary)]"
      href={`#${targetId}`}
      onClick={handleClick}
    >
      {isArabic ? 'تخطَّ إلى المحتوى الرئيسي' : 'Skip to main content'}
    </a>
  )
}

export default SkipLink
