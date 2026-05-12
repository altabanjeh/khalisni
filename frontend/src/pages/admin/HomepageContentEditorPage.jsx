import { FileText, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import PageHeader from '../../components/PageHeader'
import { getDisplayError } from '../../api/client'
import { api } from '../../api/services'
import { useAsyncData } from '../../hooks/useAsyncData'
import { fallbackPublicContent } from '../../utils/publicSiteDefaults'
import { broadcastPublicSiteUpdate } from '../../utils/publicSiteSync'
import { FieldGroup, FormMessage, ImageUploadField, ToggleField } from '../../components/publicSite/PublicSiteFormFields'

function applyServerErrors(error, setError, setFeedback) {
  Object.entries(error?.fieldErrors || {}).forEach(([field, messages]) => {
    setError(field, { type: 'server', message: messages[0] })
  })
  setFeedback({ type: 'error', text: getDisplayError(error) })
}

function HomepageContentEditorPage() {
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
      primary_button_url: data.primary_button_url || '',
      secondary_button_text: data.secondary_button_text || '',
      secondary_button_url: data.secondary_button_url || '',
      hero_image: undefined,
      how_it_works_text: data.how_it_works_text || '',
      contact_phone: data.contact_phone || '',
      whatsapp_number: data.whatsapp_number || '',
      email: data.email || '',
      office_address: data.office_address || '',
      footer_text: data.footer_text || '',
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
      setFeedback({ type: 'success', text: 'تم حفظ محتوى الصفحة الرئيسية.' })
      reload()
    } catch (error) {
      applyServerErrors(error, form.setError, setFeedback)
    }
  }

  if (loading && !data) {
    return <div className="glass-panel p-6 text-sm text-slate-500">جاري تحميل محرر الصفحة الرئيسية...</div>
  }

  return (
    <div className="page-section">
      <PageHeader
        icon={FileText}
        title="Homepage Content Editor"
        eyebrow="PUBLIC SITE"
        description="حرر النصوص والصور وروابط الأزرار وبيانات التواصل التي تظهر على الصفحة الرئيسية العامة."
      />

      <form className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]" onSubmit={form.handleSubmit(onSubmit)}>
        <section className="glass-panel space-y-5 p-6">
          <h2 className="text-xl font-extrabold text-ink">Hero Section</h2>
          <FieldGroup error={form.formState.errors.version_name} hint="اسم داخلي فقط" label="Version name / اسم النسخة">
            <input className="field" {...form.register('version_name', { required: 'اسم النسخة مطلوب' })} />
          </FieldGroup>
          <FieldGroup error={form.formState.errors.hero_title_ar} label="Hero title AR / العنوان الرئيسي">
            <input className="field" {...form.register('hero_title_ar', { required: 'العنوان العربي مطلوب' })} />
          </FieldGroup>
          <FieldGroup error={form.formState.errors.hero_title_en} label="Hero title EN / English title">
            <input className="field" {...form.register('hero_title_en')} />
          </FieldGroup>
          <FieldGroup error={form.formState.errors.hero_subtitle_ar} label="Hero subtitle AR / النص التعريفي">
            <textarea className="field min-h-28" {...form.register('hero_subtitle_ar', { required: 'النص العربي مطلوب' })} />
          </FieldGroup>
          <FieldGroup error={form.formState.errors.hero_subtitle_en} label="Hero subtitle EN / English subtitle">
            <textarea className="field min-h-28" {...form.register('hero_subtitle_en')} />
          </FieldGroup>
          <div className="grid gap-4 md:grid-cols-2">
            <FieldGroup error={form.formState.errors.primary_button_text} label="Primary button text / نص الزر الرئيسي">
              <input className="field" {...form.register('primary_button_text', { required: 'نص الزر الرئيسي مطلوب' })} />
            </FieldGroup>
            <FieldGroup error={form.formState.errors.primary_button_url} label="Primary button URL / رابط الزر الرئيسي">
              <input className="field" {...form.register('primary_button_url', { required: 'رابط الزر الرئيسي مطلوب' })} />
            </FieldGroup>
            <FieldGroup error={form.formState.errors.secondary_button_text} label="Secondary button text / نص الزر الثانوي">
              <input className="field" {...form.register('secondary_button_text')} />
            </FieldGroup>
            <FieldGroup error={form.formState.errors.secondary_button_url} label="Secondary button URL / رابط الزر الثانوي">
              <input className="field" {...form.register('secondary_button_url')} />
            </FieldGroup>
          </div>
          <ImageUploadField
            accept="image/png,image/jpeg,image/webp,image/gif"
            error={form.formState.errors.hero_image}
            fileList={heroImageFile}
            fileUrl={data?.hero_image_url}
            hint="JPG, PNG, WEBP, GIF | max 10 MB"
            label="Hero image / صورة البطل"
            registration={form.register('hero_image')}
          />
        </section>

        <section className="space-y-6">
          <div className="glass-panel space-y-5 p-6">
            <h2 className="text-xl font-extrabold text-ink">How It Works</h2>
            <FieldGroup error={form.formState.errors.how_it_works_text} label="How it works text / نص كيف تعمل المنصة">
              <textarea className="field min-h-32" {...form.register('how_it_works_text', { required: 'هذا النص مطلوب' })} />
            </FieldGroup>
          </div>

          <div className="glass-panel space-y-5 p-6">
            <h2 className="text-xl font-extrabold text-ink">Contact And Footer</h2>
            <FieldGroup error={form.formState.errors.contact_phone} label="Phone / رقم الهاتف">
              <input className="field" {...form.register('contact_phone', { required: 'رقم الهاتف مطلوب' })} />
            </FieldGroup>
            <FieldGroup error={form.formState.errors.whatsapp_number} label="WhatsApp / رقم واتساب">
              <input className="field" {...form.register('whatsapp_number', { required: 'رقم واتساب مطلوب' })} />
            </FieldGroup>
            <FieldGroup error={form.formState.errors.email} label="Email / البريد الإلكتروني">
              <input className="field" type="email" {...form.register('email', { required: 'البريد الإلكتروني مطلوب' })} />
            </FieldGroup>
            <FieldGroup error={form.formState.errors.office_address} label="Office address / عنوان المكتب">
              <input className="field" {...form.register('office_address', { required: 'عنوان المكتب مطلوب' })} />
            </FieldGroup>
            <FieldGroup error={form.formState.errors.footer_text} label="Footer text / نص التذييل">
              <textarea className="field min-h-28" {...form.register('footer_text', { required: 'نص التذييل مطلوب' })} />
            </FieldGroup>
            <ToggleField
              description="يتم عرض هذه النسخة مباشرة على الموقع العام."
              label="Active content version / النسخة النشطة"
              registration={form.register('active_content')}
            />
          </div>

          <div className="glass-panel space-y-4 p-6">
            <button className="btn-primary w-full" type="submit">
              <Save className="h-4 w-4" />
              حفظ المحتوى
            </button>
            <FormMessage message={feedback} />
          </div>
        </section>
      </form>
    </div>
  )
}

export default HomepageContentEditorPage
