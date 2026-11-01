import { ScrollText } from 'lucide-react'
import { legalApi } from '../../api/legalApi'
import LoadingSpinner from '../../components/LoadingSpinner'
import { LegalDocumentBody } from '../../components/public/LegalDocumentContent'
import { PublicHero, PublicPageShell, PublicPanel } from '../../components/public/PublicPage'
import { useLanguage } from '../../context/LanguageContext'
import { useAsyncData } from '../../hooks/useAsyncData'

async function loadTerms() {
  try {
    return await legalApi.getPublicLegalDocument('terms')
  } catch {
    return null
  }
}

function TermsPage() {
  const { isArabic } = useLanguage()
  const { data: document, loading } = useAsyncData(loadTerms, [], undefined)
  const title = document ? (isArabic ? document.title_ar : document.title_en) : isArabic ? 'شروط الاستخدام' : 'Terms of Use'

  return (
    <PublicPageShell>
      <PublicHero
        eyebrow={isArabic ? 'شروط الاستخدام' : 'Terms of Use'}
        icon={ScrollText}
        title={title}
        description={isArabic ? 'شروط استخدام منصة خلصني.' : 'The terms for using the Khalsni platform.'}
      />

      {loading && document === undefined ? (
        <LoadingSpinner />
      ) : document ? (
        <LegalDocumentBody
          document={document}
          isArabic={isArabic}
          otherLink={{ to: '/privacy', label: isArabic ? 'سياسة الخصوصية' : 'Privacy Policy' }}
        />
      ) : (
        <PublicPanel>
          <p className="text-sm font-semibold leading-7 text-slate-600">
            {isArabic ? 'شروط الاستخدام غير منشورة حالياً.' : 'The terms of use are not published yet.'}
          </p>
        </PublicPanel>
      )}
    </PublicPageShell>
  )
}

export default TermsPage
