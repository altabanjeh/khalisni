import { ShieldCheck } from 'lucide-react'
import { api } from '../../api/services'
import { legalApi } from '../../api/legalApi'
import LoadingSpinner from '../../components/LoadingSpinner'
import { LegalDocumentBody } from '../../components/public/LegalDocumentContent'
import { PublicHero, PublicPageShell, PublicPanel } from '../../components/public/PublicPage'
import { useLanguage } from '../../context/LanguageContext'
import { useAsyncData } from '../../hooks/useAsyncData'

// The privacy policy is the published legal document (versioned, D06). Only when
// no version is published does the page fall back to the approved CMS text.
async function loadPrivacyPolicy() {
  try {
    return { document: await legalApi.getPublicLegalDocument('privacy'), homepage: null }
  } catch {
    const homepage = await api.getPublicHomepage().catch(() => null)
    return { document: null, homepage }
  }
}

function PrivacyPolicyPage() {
  const { isArabic } = useLanguage()
  const { data, loading } = useAsyncData(loadPrivacyPolicy, [], null)
  const document = data?.document || null
  const cmsPolicy = String(
    isArabic ? data?.homepage?.content?.privacy_policy_ar || '' : data?.homepage?.content?.privacy_policy_en || '',
  ).trim()
  const title = document ? (isArabic ? document.title_ar : document.title_en) : isArabic ? 'سياسة الخصوصية' : 'Privacy policy'

  return (
    <PublicPageShell>
      <PublicHero
        eyebrow={isArabic ? 'سياسة الخصوصية' : 'Privacy policy'}
        icon={ShieldCheck}
        title={title}
        description={isArabic ? 'كيف تتعامل منصة خلصني مع بياناتك ومستنداتك.' : 'How the Khalsni platform handles your data and documents.'}
      />

      {loading && !data ? (
        <LoadingSpinner />
      ) : document || cmsPolicy ? (
        <LegalDocumentBody
          document={document}
          fallbackText={cmsPolicy}
          isArabic={isArabic}
          otherLink={{ to: '/terms', label: isArabic ? 'شروط الاستخدام' : 'Terms of Use' }}
        />
      ) : (
        <PublicPanel>
          <p className="text-sm font-semibold leading-7 text-slate-600">
            {isArabic ? 'سياسة الخصوصية غير منشورة حالياً.' : 'The privacy policy is not published yet.'}
          </p>
        </PublicPanel>
      )}
    </PublicPageShell>
  )
}

export default PrivacyPolicyPage
