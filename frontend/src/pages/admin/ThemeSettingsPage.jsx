import { Palette, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import PageHeader from '../../components/PageHeader'
import { getDisplayError } from '../../api/client'
import { api } from '../../api/services'
import { useLanguage } from '../../context/LanguageContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { fallbackPublicTheme } from '../../utils/publicSiteDefaults'
import { broadcastPublicSiteUpdate } from '../../utils/publicSiteSync'
import LoadingSpinner from '../../components/LoadingSpinner'
import { ColorPickerField, FieldGroup, FormMessage, ImageUploadField, ToggleField } from '../../components/publicSite/PublicSiteFormFields'

function applyServerErrors(error, setError, setFeedback) {
  Object.entries(error?.fieldErrors || {}).forEach(([field, messages]) => {
    setError(field, { type: 'server', message: messages[0] })
  })
  setFeedback({ type: 'error', text: getDisplayError(error) })
}

function ThemeSettingsPage() {
  const { isArabic } = useLanguage()
  const { data, loading, reload } = useAsyncData(() => api.getAdminPublicSiteTheme(), [], null)
  const [feedback, setFeedback] = useState(null)
  const form = useForm({ defaultValues: fallbackPublicTheme })
  const logoFile = form.watch('logo')
  const faviconFile = form.watch('favicon')
  const primaryColor = form.watch('primary_color')
  const secondaryColor = form.watch('secondary_color')
  const backgroundColor = form.watch('background_color')
  const textColor = form.watch('text_color')
  const headerBackgroundColor = form.watch('header_background_color')
  const footerBackgroundColor = form.watch('footer_background_color')

  useEffect(() => {
    if (!data) return
    form.reset({
      name: data.name || '',
      primary_color: data.primary_color || fallbackPublicTheme.primary_color,
      secondary_color: data.secondary_color || fallbackPublicTheme.secondary_color,
      background_color: data.background_color || fallbackPublicTheme.background_color,
      text_color: data.text_color || fallbackPublicTheme.text_color,
      header_background_color: data.header_background_color || fallbackPublicTheme.header_background_color,
      footer_background_color: data.footer_background_color || fallbackPublicTheme.footer_background_color,
      logo: undefined,
      favicon: undefined,
      active_theme: Boolean(data.active_theme),
    })
  }, [data, form])

  async function onSubmit(values) {
    setFeedback(null)
    try {
      const payload = {
        ...values,
        logo: values.logo?.[0],
        favicon: values.favicon?.[0],
        active_theme: Boolean(values.active_theme),
      }
      await api.updateAdminPublicSiteTheme(payload)
      broadcastPublicSiteUpdate('theme-settings')
      setFeedback({ type: 'success', text: isArabic ? 'تم حفظ إعدادات المظهر.' : 'Theme settings saved.' })
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
        icon={Palette}
        title={isArabic ? 'إعدادات المظهر' : 'Theme Settings'}
        eyebrow={isArabic ? 'الموقع العام' : 'PUBLIC SITE'}
        description={
          isArabic
            ? 'التحكم بالألوان الأساسية والخلفيات والشعار والأيقونة. القيم تُطبّق على الواجهة العامة باستخدام متغيرات CSS.'
            : 'Control brand colors, backgrounds, logo, and favicon for the public site using CSS variables.'
        }
      />

      <form className="grid gap-6 xl:grid-cols-[1fr_0.9fr]" onSubmit={form.handleSubmit(onSubmit)}>
        <section className="glass-panel space-y-5 p-6">
          <FieldGroup error={form.formState.errors.name} label={isArabic ? 'اسم النمط / Theme name' : 'Theme name / اسم النمط'}>
            <input className="field" {...form.register('name', { required: isArabic ? 'اسم النمط مطلوب' : 'Theme name is required' })} />
          </FieldGroup>
          <div className="grid gap-4 md:grid-cols-2">
            <ColorPickerField error={form.formState.errors.primary_color} hint={isArabic ? 'رئيسي' : 'Primary'} label={isArabic ? 'اللون الرئيسي / Primary color' : 'Primary color / اللون الرئيسي'} name="primary_color" register={form.register} setValue={form.setValue} value={primaryColor} />
            <ColorPickerField error={form.formState.errors.secondary_color} hint={isArabic ? 'ثانوي' : 'Secondary'} label={isArabic ? 'اللون الثانوي / Secondary color' : 'Secondary color / اللون الثانوي'} name="secondary_color" register={form.register} setValue={form.setValue} value={secondaryColor} />
            <ColorPickerField error={form.formState.errors.background_color} hint={isArabic ? 'خلفية الصفحة' : 'Page background'} label={isArabic ? 'خلفية الصفحة / Background color' : 'Background color / خلفية الصفحة'} name="background_color" register={form.register} setValue={form.setValue} value={backgroundColor} />
            <ColorPickerField error={form.formState.errors.text_color} hint={isArabic ? 'النص الرئيسي' : 'Main text'} label={isArabic ? 'لون النص / Text color' : 'Text color / لون النص'} name="text_color" register={form.register} setValue={form.setValue} value={textColor} />
            <ColorPickerField error={form.formState.errors.header_background_color} hint={isArabic ? 'الرأس' : 'Header'} label={isArabic ? 'خلفية الرأس / Header background' : 'Header background / خلفية الرأس'} name="header_background_color" register={form.register} setValue={form.setValue} value={headerBackgroundColor} />
            <ColorPickerField error={form.formState.errors.footer_background_color} hint={isArabic ? 'التذييل' : 'Footer'} label={isArabic ? 'خلفية التذييل / Footer background' : 'Footer background / خلفية التذييل'} name="footer_background_color" register={form.register} setValue={form.setValue} value={footerBackgroundColor} />
          </div>
        </section>

        <section className="space-y-6">
          <div className="glass-panel space-y-5 p-6">
            <ImageUploadField
              accept="image/png,image/jpeg,image/webp,image/gif"
              error={form.formState.errors.logo}
              fileList={logoFile}
              fileUrl={data?.logo_url}
              hint={isArabic ? 'مقترح لشعار الرأس' : 'Recommended for header branding'}
              label={isArabic ? 'الشعار / Logo' : 'Logo / الشعار'}
              registration={form.register('logo')}
            />
            <ImageUploadField
              accept="image/png,image/jpeg,image/webp,image/gif,image/x-icon"
              error={form.formState.errors.favicon}
              fileList={faviconFile}
              fileUrl={data?.favicon_url}
              hint={isArabic ? 'أيقونة تبويب المتصفح' : 'Browser tab icon'}
              label={isArabic ? 'أيقونة المتصفح / Favicon' : 'Favicon / أيقونة المتصفح'}
              registration={form.register('favicon')}
            />
            <ToggleField
              description={isArabic ? 'يتم استخدام هذا النمط على الواجهة العامة مباشرة.' : 'Apply this theme directly to the public site.'}
              label={isArabic ? 'النمط النشط / Active theme' : 'Active theme / النمط النشط'}
              registration={form.register('active_theme')}
            />
          </div>

          <div className="glass-panel p-6">
            <div
              className="overflow-hidden rounded-[2rem] border border-border"
              style={{
                backgroundColor,
                color: textColor,
              }}
            >
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ backgroundColor: headerBackgroundColor }}
              >
                <span className="text-sm font-bold">{isArabic ? 'معاينة الرأس' : 'Header preview'}</span>
                <span className="rounded-full px-3 py-1 text-xs text-white" style={{ backgroundColor: primaryColor }}>
                  {isArabic ? 'رئيسي' : 'Primary'}
                </span>
              </div>
              <div className="space-y-4 px-5 py-6">
                <div className="h-4 w-36 rounded-full" style={{ backgroundColor: textColor }} />
                <div className="h-3 w-full rounded-full bg-black/10" />
                <div className="h-3 w-3/4 rounded-full bg-black/10" />
                <div className="flex gap-3">
                  <span className="rounded-2xl px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: primaryColor }}>
                    {isArabic ? 'زر رئيسي' : 'Primary button'}
                  </span>
                  <span className="rounded-2xl px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: secondaryColor }}>
                    {isArabic ? 'زر ثانوي' : 'Secondary button'}
                  </span>
                </div>
              </div>
              <div className="px-5 py-4 text-sm text-white" style={{ backgroundColor: footerBackgroundColor }}>
                {isArabic ? 'معاينة التذييل' : 'Footer preview'}
              </div>
            </div>
          </div>

          <div className="glass-panel space-y-4 p-6">
            <button className="btn-primary w-full" type="submit">
              <Save className="h-4 w-4" />
              {isArabic ? 'حفظ إعدادات المظهر' : 'Save theme settings'}
            </button>
            <FormMessage message={feedback} />
          </div>
        </section>
      </form>
    </div>
  )
}

export default ThemeSettingsPage
