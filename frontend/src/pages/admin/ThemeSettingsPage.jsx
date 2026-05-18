import { Palette, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import PageHeader from '../../components/PageHeader'
import { getDisplayError } from '../../api/client'
import { api } from '../../api/services'
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
      setFeedback({ type: 'success', text: 'تم حفظ إعدادات المظهر.' })
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
        title="Theme Settings"
        eyebrow="PUBLIC SITE"
        description="التحكم بالألوان الأساسية والخلفيات والشعار والأيقونة. القيم تُطبّق على الواجهة العامة باستخدام CSS variables."
      />

      <form className="grid gap-6 xl:grid-cols-[1fr_0.9fr]" onSubmit={form.handleSubmit(onSubmit)}>
        <section className="glass-panel space-y-5 p-6">
          <FieldGroup error={form.formState.errors.name} label="Theme name / اسم النمط">
            <input className="field" {...form.register('name', { required: 'اسم النمط مطلوب' })} />
          </FieldGroup>
          <div className="grid gap-4 md:grid-cols-2">
            <ColorPickerField error={form.formState.errors.primary_color} hint="Primary" label="Primary color / اللون الرئيسي" name="primary_color" register={form.register} setValue={form.setValue} value={primaryColor} />
            <ColorPickerField error={form.formState.errors.secondary_color} hint="Secondary" label="Secondary color / اللون الثانوي" name="secondary_color" register={form.register} setValue={form.setValue} value={secondaryColor} />
            <ColorPickerField error={form.formState.errors.background_color} hint="Page background" label="Background color / خلفية الصفحة" name="background_color" register={form.register} setValue={form.setValue} value={backgroundColor} />
            <ColorPickerField error={form.formState.errors.text_color} hint="Main text" label="Text color / لون النص" name="text_color" register={form.register} setValue={form.setValue} value={textColor} />
            <ColorPickerField error={form.formState.errors.header_background_color} hint="Header" label="Header background / خلفية الرأس" name="header_background_color" register={form.register} setValue={form.setValue} value={headerBackgroundColor} />
            <ColorPickerField error={form.formState.errors.footer_background_color} hint="Footer" label="Footer background / خلفية التذييل" name="footer_background_color" register={form.register} setValue={form.setValue} value={footerBackgroundColor} />
          </div>
        </section>

        <section className="space-y-6">
          <div className="glass-panel space-y-5 p-6">
            <ImageUploadField
              accept="image/png,image/jpeg,image/webp,image/gif"
              error={form.formState.errors.logo}
              fileList={logoFile}
              fileUrl={data?.logo_url}
              hint="Recommended for header branding"
              label="Logo / الشعار"
              registration={form.register('logo')}
            />
            <ImageUploadField
              accept="image/png,image/jpeg,image/webp,image/gif,image/x-icon"
              error={form.formState.errors.favicon}
              fileList={faviconFile}
              fileUrl={data?.favicon_url}
              hint="Browser tab icon"
              label="Favicon / أيقونة المتصفح"
              registration={form.register('favicon')}
            />
            <ToggleField
              description="يتم استخدام هذا النمط على الواجهة العامة مباشرة."
              label="Active theme / النمط النشط"
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
                <span className="text-sm font-bold">Header preview</span>
                <span className="rounded-full px-3 py-1 text-xs text-white" style={{ backgroundColor: primaryColor }}>
                  Primary
                </span>
              </div>
              <div className="space-y-4 px-5 py-6">
                <div className="h-4 w-36 rounded-full" style={{ backgroundColor: textColor }} />
                <div className="h-3 w-full rounded-full bg-black/10" />
                <div className="h-3 w-3/4 rounded-full bg-black/10" />
                <div className="flex gap-3">
                  <span className="rounded-2xl px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: primaryColor }}>
                    Primary button
                  </span>
                  <span className="rounded-2xl px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: secondaryColor }}>
                    Secondary button
                  </span>
                </div>
              </div>
              <div className="px-5 py-4 text-sm text-white" style={{ backgroundColor: footerBackgroundColor }}>
                Footer preview
              </div>
            </div>
          </div>

          <div className="glass-panel space-y-4 p-6">
            <button className="btn-primary w-full" type="submit">
              <Save className="h-4 w-4" />
              حفظ إعدادات المظهر
            </button>
            <FormMessage message={feedback} />
          </div>
        </section>
      </form>
    </div>
  )
}

export default ThemeSettingsPage
