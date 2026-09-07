import { FileText, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import PageHeader from '../../components/PageHeader'
import { getDisplayError } from '../../api/client'
import { api } from '../../api/services'
import { useLanguage } from '../../context/LanguageContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { fallbackPublicContent } from '../../utils/publicSiteDefaults'
import { broadcastPublicSiteUpdate } from '../../utils/publicSiteSync'
import LoadingSpinner from '../../components/LoadingSpinner'
import { FieldGroup, FormMessage, ImageUploadField, ToggleField } from '../../components/publicSite/PublicSiteFormFields'

function applyServerErrors(error, setError, setFeedback) {
  Object.entries(error?.fieldErrors || {}).forEach(([field, messages]) => {
    setError(field, { type: 'server', message: messages[0] })
  })
  setFeedback({ type: 'error', text: getDisplayError(error) })
}

function HomepageContentEditorPage() {
  const { isArabic } = useLanguage()
  const tr = (ar, en) => (isArabic ? ar : en)
  const { data, loading, reload } = useAsyncData(() => api.getAdminPublicSiteContent(), [], null)
  const [feedback, setFeedback] = useState(null)
  const form = useForm({ defaultValues: fallbackPublicContent })
  const heroImageFile = form.watch('hero_image')

  useEffect(() => {
    if (!data) return
    form.reset({
      version_name: data.version_name || '',
      hero_title_ar: data.hero_title_ar || '',
      hero_title_en: data.hero_title_en || '',
      hero_subtitle_ar: data.hero_subtitle_ar || '',
      hero_subtitle_en: data.hero_subtitle_en || '',
      primary_button_text: data.primary_button_text || '',
      primary_button_text_en: data.primary_button_text_en || '',
      primary_button_url: data.primary_button_url || '',
      secondary_button_text: data.secondary_button_text || '',
      secondary_button_text_en: data.secondary_button_text_en || '',
      secondary_button_url: data.secondary_button_url || '',
      hero_image: undefined,
      how_it_works_text: data.how_it_works_text || '',
      how_it_works_text_en: data.how_it_works_text_en || '',
      contact_phone: data.contact_phone || '',
      whatsapp_number: data.whatsapp_number || '',
      email: data.email || '',
      office_address: data.office_address || '',
      office_address_en: data.office_address_en || '',
      footer_text: data.footer_text || '',
      footer_text_en: data.footer_text_en || '',
      active_content: Boolean(data.active_content),
    })
  }, [data, form])

  async function onSubmit(values) {
    setFeedback(null)
    try {
      const payload = {
        ...values,
        hero_image: values.hero_image?.[0],
        active_content: Boolean(values.active_content),
      }
      await api.updateAdminPublicSiteContent(payload)
      broadcastPublicSiteUpdate('homepage-content')
      setFeedback({ type: 'success', text: tr('تم حفظ محتوى الصفحة الرئيسية.', 'Homepage content saved.') })
      reload()
    } catch (error) {
      applyServerErrors(error, form.setError, setFeedback)
    }
  }

  if (loading && !data) {
    return <LoadingSpinner />
  }

  return (
    <div className="page-section">
      <PageHeader
        icon={FileText}
        title={isArabic ? 'محرر محتوى الصفحة الرئيسية' : 'Homepage Content Editor'}
        eyebrow={isArabic ? 'الموقع العام' : 'Public site'}
        description={tr(
          'حرر النصوص والصور وروابط الأزرار وبيانات التواصل التي تظهر على الصفحة الرئيسية العامة.',
          'Edit the text, images, button links and contact details shown on the public homepage.',
        )}
      />

      <form className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]" onSubmit={form.handleSubmit(onSubmit)}>
        <section className="glass-panel space-y-5 p-6">
          <h2 className="text-xl font-extrabold text-ink">{isArabic ? 'قسم البطل' : 'Hero section'}</h2>
          <FieldGroup error={form.formState.errors.version_name} hint={tr('اسم داخلي فقط', 'Internal name only')} label={tr('اسم النسخة', 'Version name')}>
            <input className="field" {...form.register('version_name', { required: tr('اسم النسخة مطلوب', 'Version name is required') })} />
          </FieldGroup>
          <FieldGroup error={form.formState.errors.hero_title_ar} label={tr('العنوان الرئيسي (عربي)', 'Hero title (Arabic)')}>
            <input className="field" {...form.register('hero_title_ar', { required: tr('العنوان العربي مطلوب', 'Arabic title is required') })} />
          </FieldGroup>
          <FieldGroup error={form.formState.errors.hero_title_en} label={tr('العنوان الرئيسي (إنجليزي)', 'Hero title (English)')}>
            <input className="field" {...form.register('hero_title_en')} />
          </FieldGroup>
          <FieldGroup error={form.formState.errors.hero_subtitle_ar} label={tr('النص التعريفي (عربي)', 'Hero subtitle (Arabic)')}>
            <textarea className="field min-h-28" {...form.register('hero_subtitle_ar', { required: tr('النص العربي مطلوب', 'Arabic subtitle is required') })} />
          </FieldGroup>
          <FieldGroup error={form.formState.errors.hero_subtitle_en} label={tr('النص التعريفي (إنجليزي)', 'Hero subtitle (English)')}>
            <textarea className="field min-h-28" {...form.register('hero_subtitle_en')} />
          </FieldGroup>
          <div className="grid gap-4 md:grid-cols-2">
            <FieldGroup error={form.formState.errors.primary_button_text} label={tr('نص الزر الرئيسي (عربي)', 'Primary button text (Arabic)')}>
              <input className="field" {...form.register('primary_button_text', { required: tr('نص الزر الرئيسي مطلوب', 'Primary button text is required') })} />
            </FieldGroup>
            <FieldGroup error={form.formState.errors.primary_button_text_en} label={tr('نص الزر الرئيسي (إنجليزي)', 'Primary button text (English)')}>
              <input className="field" {...form.register('primary_button_text_en')} />
            </FieldGroup>
            <FieldGroup error={form.formState.errors.primary_button_url} label={tr('رابط الزر الرئيسي', 'Primary button URL')}>
              <input className="field" {...form.register('primary_button_url', { required: tr('رابط الزر الرئيسي مطلوب', 'Primary button URL is required') })} />
            </FieldGroup>
            <div />
            <FieldGroup error={form.formState.errors.secondary_button_text} label={tr('نص الزر الثانوي (عربي)', 'Secondary button text (Arabic)')}>
              <input className="field" {...form.register('secondary_button_text')} />
            </FieldGroup>
            <FieldGroup error={form.formState.errors.secondary_button_text_en} label={tr('نص الزر الثانوي (إنجليزي)', 'Secondary button text (English)')}>
              <input className="field" {...form.register('secondary_button_text_en')} />
            </FieldGroup>
            <FieldGroup error={form.formState.errors.secondary_button_url} label={tr('رابط الزر الثانوي', 'Secondary button URL')}>
              <input className="field" {...form.register('secondary_button_url')} />
            </FieldGroup>
          </div>
          <ImageUploadField
            accept="image/png,image/jpeg,image/webp,image/gif"
            error={form.formState.errors.hero_image}
            fileList={heroImageFile}
            fileUrl={data?.hero_image_url}
            hint="JPG, PNG, WEBP, GIF | max 10 MB"
            label={tr('صورة البطل', 'Hero image')}
            registration={form.register('hero_image')}
          />
        </section>

        <section className="space-y-6">
          <div className="glass-panel space-y-5 p-6">
            <h2 className="text-xl font-extrabold text-ink">{isArabic ? 'كيف تعمل المنصة' : 'How it works'}</h2>
            <FieldGroup error={form.formState.errors.how_it_works_text} label={tr('نص «كيف تعمل المنصة» (عربي)', 'How it works text (Arabic)')}>
              <textarea className="field min-h-32" {...form.register('how_it_works_text', { required: tr('هذا النص مطلوب', 'This text is required') })} />
            </FieldGroup>
            <FieldGroup error={form.formState.errors.how_it_works_text_en} label={tr('نص «كيف تعمل المنصة» (إنجليزي)', 'How it works text (English)')}>
              <textarea className="field min-h-32" {...form.register('how_it_works_text_en')} />
            </FieldGroup>
          </div>

          <div className="glass-panel space-y-5 p-6">
            <h2 className="text-xl font-extrabold text-ink">{isArabic ? 'التواصل والتذييل' : 'Contact and footer'}</h2>
            <FieldGroup error={form.formState.errors.contact_phone} label={tr('رقم الهاتف', 'Phone')}>
              <input className="field" {...form.register('contact_phone', { required: tr('رقم الهاتف مطلوب', 'Phone is required') })} />
            </FieldGroup>
            <FieldGroup error={form.formState.errors.whatsapp_number} label={tr('رقم واتساب', 'WhatsApp')}>
              <input className="field" {...form.register('whatsapp_number', { required: tr('رقم واتساب مطلوب', 'WhatsApp number is required') })} />
            </FieldGroup>
            <FieldGroup error={form.formState.errors.email} label={tr('البريد الإلكتروني', 'Email')}>
              <input className="field" type="email" {...form.register('email', { required: tr('البريد الإلكتروني مطلوب', 'Email is required') })} />
            </FieldGroup>
            <FieldGroup error={form.formState.errors.office_address} label={tr('عنوان المكتب (عربي)', 'Office address (Arabic)')}>
              <input className="field" {...form.register('office_address', { required: tr('عنوان المكتب مطلوب', 'Office address is required') })} />
            </FieldGroup>
            <FieldGroup error={form.formState.errors.office_address_en} label={tr('عنوان المكتب (إنجليزي)', 'Office address (English)')}>
              <input className="field" {...form.register('office_address_en')} />
            </FieldGroup>
            <FieldGroup error={form.formState.errors.footer_text} label={tr('نص التذييل (عربي)', 'Footer text (Arabic)')}>
              <textarea className="field min-h-28" {...form.register('footer_text', { required: tr('نص التذييل مطلوب', 'Footer text is required') })} />
            </FieldGroup>
            <FieldGroup error={form.formState.errors.footer_text_en} label={tr('نص التذييل (إنجليزي)', 'Footer text (English)')}>
              <textarea className="field min-h-28" {...form.register('footer_text_en')} />
            </FieldGroup>
            <ToggleField
              description={tr('يتم عرض هذه النسخة مباشرة على الموقع العام.', 'This version is shown directly on the public site.')}
              label={tr('النسخة النشطة', 'Active content version')}
              registration={form.register('active_content')}
            />
          </div>

          <div className="glass-panel space-y-4 p-6">
            <button className="btn-primary w-full" type="submit">
              <Save className="h-4 w-4" />
              {tr('حفظ المحتوى', 'Save content')}
            </button>
            <FormMessage message={feedback} />
          </div>
        </section>
      </form>
    </div>
  )
}

export default HomepageContentEditorPage
