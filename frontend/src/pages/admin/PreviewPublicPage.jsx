import { Eye } from 'lucide-react'
import { useEffect, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import { useLanguage } from '../../context/LanguageContext'
import { subscribePublicSiteUpdates } from '../../utils/publicSiteSync'

function PreviewPublicPage() {
  const { isArabic } = useLanguage()
  const [version, setVersion] = useState(0)

  useEffect(() => subscribePublicSiteUpdates(() => setVersion(Date.now())), [])

  return (
    <div className="page-section">
      <PageHeader
        icon={Eye}
        title={isArabic ? 'معاينة الموقع العام' : 'Preview public site'}
        eyebrow={isArabic ? 'الموقع العام' : 'Public site'}
        description={isArabic
          ? 'هذه الصفحة تعرض الصفحة الرئيسية المنشورة نفسها. يتجدد العرض بعد حفظ المحتوى.'
          : 'This is the published homepage itself. The preview refreshes after content is saved.'}
      />
      <iframe
        className="min-h-[800px] w-full rounded-[var(--radius-xl)] border border-border bg-white"
        key={version}
        src={`/?preview_version=${version}`}
        title={isArabic ? 'الصفحة الرئيسية المنشورة' : 'Published homepage'}
      />
    </div>
  )
}

export default PreviewPublicPage
