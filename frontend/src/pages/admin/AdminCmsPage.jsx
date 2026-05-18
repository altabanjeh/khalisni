import { Database, Settings2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import DataTable from '../../components/DataTable'
import FormModal from '../../components/FormModal'
import PageHeader from '../../components/PageHeader'
import { getDisplayError } from '../../api/client'
import { api } from '../../api/services'
import { useToast } from '../../context/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'

const defaultValues = {
  key: '',
  description: '',
  hero_title: '',
  hero_subtitle: '',
  phone: '',
  email: '',
}

const safeSettingDefinitions = [
  { key: 'site.homepage', label: 'محتوى الصفحة الرئيسية', description: 'العنوان الرئيسي والنص التعريفي المختصر.' },
  { key: 'site.contact', label: 'بيانات التواصل', description: 'الهاتف والبريد الظاهرين للعملاء.' },
]

function Field({ label, children, hint }) {
  return (
    <label className="space-y-2">
      <div className="space-y-1">
        <span className="text-sm font-semibold text-ink">{label}</span>
        {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
      </div>
      {children}
    </label>
  )
}

function SettingFields({ settingKey, form, selectedSetting }) {
  const fields = selectedSetting?.fields || []

  if (fields.length) {
    return fields.map((field) => {
      const commonProps = form.register(field.key)

      return (
        <Field key={field.key} hint={field.help_text} label={field.label}>
          {field.control === 'textarea' ? (
            <textarea className="field min-h-28" {...commonProps} />
          ) : (
            <input className="field" type={field.control === 'email' ? 'email' : 'text'} {...commonProps} />
          )}
        </Field>
      )
    })
  }

  if (settingKey === 'site.homepage') {
    return (
      <>
        <Field label="العنوان الرئيسي">
          <input className="field" {...form.register('hero_title', { required: true })} />
        </Field>
        <Field label="النص التعريفي">
          <textarea className="field min-h-28" {...form.register('hero_subtitle', { required: true })} />
        </Field>
      </>
    )
  }

  if (settingKey === 'site.contact') {
    return (
      <>
        <Field label="رقم الهاتف">
          <input className="field" {...form.register('phone', { required: true })} />
        </Field>
        <Field label="البريد الإلكتروني">
          <input className="field" type="email" {...form.register('email', { required: true })} />
        </Field>
      </>
    )
  }

  return null
}

function AdminCmsPage() {
  const { toast } = useToast()
  const { data: settings = [], loading, reload } = useAsyncData(() => api.getSystemSettings(), [], [])
  const [selectedSettingId, setSelectedSettingId] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const form = useForm({ defaultValues })

  const selectedSetting = useMemo(
    () => settings.find((item) => String(item.id) === String(selectedSettingId)) || null,
    [settings, selectedSettingId],
  )

  const existingKeys = useMemo(() => new Set(settings.map((setting) => setting.key)), [settings])
  const creatableSettings = useMemo(
    () => safeSettingDefinitions.filter((definition) => !existingKeys.has(definition.key)),
    [existingKeys],
  )

  useEffect(() => {
    if (!selectedSetting) {
      form.reset({
        ...defaultValues,
        key: creatableSettings[0]?.key || '',
      })
      return
    }

    const nextValues = {
      ...defaultValues,
      key: selectedSetting.key || '',
      description: selectedSetting.description || '',
    }

    Object.entries(selectedSetting.value || {}).forEach(([key, value]) => {
      nextValues[key] = value ?? ''
    })

    form.reset(nextValues)
  }, [creatableSettings, form, selectedSetting])

  function closeForm() {
    setIsFormOpen(false)
    setSelectedSettingId(null)
    form.reset({
      ...defaultValues,
      key: creatableSettings[0]?.key || '',
    })
  }

  function openCreateForm() {
    setSelectedSettingId(null)
    form.reset({
      ...defaultValues,
      key: creatableSettings[0]?.key || '',
    })
    setIsFormOpen(true)
  }

  function openEditForm(id) {
    setSelectedSettingId(id)
    setIsFormOpen(true)
  }

  function buildPayload(values) {
    const payload = {
      key: values.key,
      description: values.description?.trim() || '',
    }

    if (values.key === 'site.homepage') {
      payload.hero_title = values.hero_title?.trim() || ''
      payload.hero_subtitle = values.hero_subtitle?.trim() || ''
    }

    if (values.key === 'site.contact') {
      payload.phone = values.phone?.trim() || ''
      payload.email = values.email?.trim() || ''
    }

    return payload
  }

  async function handleSubmit(values) {
    setSubmitting(true)
    try {
      const payload = buildPayload(values)
      if (selectedSetting) {
        await api.updateSystemSetting(selectedSetting.id, payload)
        toast('تم تحديث الإعداد.', 'success')
      } else {
        await api.createSystemSetting(payload)
        toast('تم إنشاء الإعداد.', 'success')
      }
      reload()
      closeForm()
    } catch (error) {
      toast(getDisplayError(error), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    { key: 'label', label: 'الإعداد', render: (row) => row.label || row.key },
    { key: 'description', label: 'الوصف', render: (row) => row.description || 'بدون وصف' },
    {
      key: 'value_preview',
      label: 'القيمة الحالية',
      render: (row) =>
        Object.entries(row.value || {})
          .map(([key, value]) => `${key}: ${value}`)
          .join(' | ') || 'لا توجد بيانات',
    },
    {
      key: 'actions',
      label: 'الإجراءات',
      render: (row) => (
        <button className="btn-secondary px-3 py-2 text-xs" onClick={() => openEditForm(row.id)} type="button">
          تعديل
        </button>
      ),
    },
  ]

  const activeKey = form.watch('key')
  const activeDefinition = safeSettingDefinitions.find((definition) => definition.key === activeKey)

  return (
    <div className="page-section space-y-6">
      <PageHeader
        description="هذه الشاشة أصبحت مخصصة لإعدادات النظام الآمنة فقط. إدارة الخدمات والفئات والمستخدمين نُقلت إلى شاشاتها المتخصصة حتى لا تتكرر نفس العمليات في أكثر من مكان."
        eyebrow="إعدادات النظام"
        icon={Database}
        title="System Settings"
        actions={
          <button
            className="btn-primary"
            disabled={!creatableSettings.length}
            onClick={openCreateForm}
            type="button"
          >
            + إعداد جديد
          </button>
        }
      />

      <section className="glass-panel grid gap-4 p-5 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-border bg-slate-50/70 p-5">
          <p className="text-sm font-bold text-ink">تنظيم أوضح</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            تم إخراج الخدمات والفئات والمستخدمين من هذه الشاشة لأن لها صفحات إدارة مستقلة. هذا يمنع التكرار ويجعل كل شاشة مسؤولة عن بياناتها فقط.
          </p>
        </div>
        <div className="rounded-3xl border border-border bg-slate-50/70 p-5">
          <div className="flex items-start gap-3">
            <span className="icon-chip">
              <Settings2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">ملاحظة تشغيلية</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                حذف إعدادات النظام غير متاح من الواجهة لأن هذه المفاتيح مقيدة من الخلفية. المتاح هنا هو الإنشاء للمفاتيح الناقصة والتعديل على القيم الآمنة فقط.
              </p>
            </div>
          </div>
        </div>
      </section>

      <DataTable
        columns={columns}
        emptyDescription="أضف إعدادا آمنا جديدا إذا كان أحد مفاتيح النظام العامة غير موجود بعد."
        emptyTitle="لا توجد إعدادات نظام"
        loading={loading}
        rows={settings}
      />

      <FormModal
        description={selectedSetting ? 'عدّل الحقول الآمنة لهذا الإعداد فقط.' : 'أنشئ مفتاحا آمنا مفقودا من النظام.'}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn-secondary" onClick={closeForm} type="button">
              إلغاء
            </button>
            <button className="btn-primary min-w-40" disabled={submitting} form="system-setting-form" type="submit">
              {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {selectedSetting ? 'حفظ التعديلات' : 'إضافة الإعداد'}
            </button>
          </div>
        }
        onClose={closeForm}
        open={isFormOpen}
        size="lg"
        title={selectedSetting ? selectedSetting.label || selectedSetting.key : 'إعداد نظام جديد'}
      >
        <form className="space-y-5" id="system-setting-form" onSubmit={form.handleSubmit(handleSubmit)}>
          <Field label="المفتاح">
            <select className="field" disabled={Boolean(selectedSetting)} {...form.register('key', { required: true })}>
              <option value="">اختر الإعداد</option>
              {selectedSetting ? (
                <option value={selectedSetting.key}>{selectedSetting.label || selectedSetting.key}</option>
              ) : (
                creatableSettings.map((setting) => (
                  <option key={setting.key} value={setting.key}>
                    {setting.label}
                  </option>
                ))
              )}
            </select>
          </Field>

          <Field label="وصف داخلي">
            <input className="field" {...form.register('description')} />
          </Field>

          {activeDefinition ? (
            <div className="rounded-3xl border border-border bg-slate-50/70 p-5">
              <p className="text-sm font-bold text-ink">{activeDefinition.label}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{activeDefinition.description}</p>
            </div>
          ) : null}

          <div className="space-y-4">
            <SettingFields form={form} selectedSetting={selectedSetting} settingKey={activeKey} />
          </div>
        </form>
      </FormModal>
    </div>
  )
}

export default AdminCmsPage
