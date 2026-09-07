import { Database, Settings2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import DataTable from '../../components/DataTable'
import FormModal from '../../components/FormModal'
import PageHeader from '../../components/PageHeader'
import { getDisplayError } from '../../api/client'
import { api } from '../../api/services'
import { useLanguage } from '../../context/LanguageContext'
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

const defaultDeleteGuardForm = {
  delete_password: '',
  confirm_delete_password: '',
}

const safeSettingDefinitions = [
  {
    key: 'site.homepage',
    label_ar: 'محتوى الصفحة الرئيسية',
    label_en: 'Homepage content',
    description_ar: 'العنوان الرئيسي والنص التعريفي المختصر.',
    description_en: 'The hero title and the short introductory text.',
  },
  {
    key: 'site.contact',
    label_ar: 'بيانات التواصل',
    label_en: 'Contact details',
    description_ar: 'الهاتف والبريد الظاهرين للعملاء.',
    description_en: 'The phone and email shown to customers.',
  },
]

function definitionLabel(definition, isArabic) {
  return isArabic ? definition.label_ar : definition.label_en
}
function definitionDescription(definition, isArabic) {
  return isArabic ? definition.description_ar : definition.description_en
}

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

function SettingFields({ settingKey, form, selectedSetting, isArabic }) {
  const tr = (ar, en) => (isArabic ? ar : en)
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
        <Field label={tr('العنوان الرئيسي', 'Hero title')}>
          <input className="field" {...form.register('hero_title', { required: true })} />
        </Field>
        <Field label={tr('النص التعريفي', 'Intro text')}>
          <textarea className="field min-h-28" {...form.register('hero_subtitle', { required: true })} />
        </Field>
      </>
    )
  }

  if (settingKey === 'site.contact') {
    return (
      <>
        <Field label={tr('رقم الهاتف', 'Phone')}>
          <input className="field" {...form.register('phone', { required: true })} />
        </Field>
        <Field label={tr('البريد الإلكتروني', 'Email')}>
          <input className="field" type="email" {...form.register('email', { required: true })} />
        </Field>
      </>
    )
  }

  return null
}

function AdminCmsPage() {
  const { toast } = useToast()
  const { isArabic } = useLanguage()
  const tr = (ar, en) => (isArabic ? ar : en)
  const { data: settings = [], loading, reload } = useAsyncData(() => api.getSystemSettings(), [], [])
  const { data: deleteGuard = null, reload: reloadDeleteGuard } = useAsyncData(() => api.getDeleteGuardConfig(), [], null)
  const [selectedSettingId, setSelectedSettingId] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleteGuardForm, setDeleteGuardForm] = useState(defaultDeleteGuardForm)
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
        toast(tr('تم تحديث الإعداد.', 'Setting updated.'), 'success')
      } else {
        await api.createSystemSetting(payload)
        toast(tr('تم إنشاء الإعداد.', 'Setting created.'), 'success')
      }
      reload()
      closeForm()
    } catch (error) {
      toast(getDisplayError(error), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteGuardSave() {
    try {
      await api.updateDeleteGuardConfig(deleteGuardForm)
      reloadDeleteGuard()
      setDeleteGuardForm(defaultDeleteGuardForm)
      toast(tr('تم حفظ كلمة مرور الحذف.', 'Delete password saved.'), 'success')
    } catch (error) {
      toast(getDisplayError(error), 'error')
    }
  }

  const columns = [
    { key: 'label', label: tr('الإعداد', 'Setting'), render: (row) => row.label || row.key },
    { key: 'description', label: tr('الوصف', 'Description'), render: (row) => row.description || tr('بدون وصف', 'No description') },
    {
      key: 'value_preview',
      label: tr('القيمة الحالية', 'Current value'),
      render: (row) =>
        Object.entries(row.value || {})
          .map(([key, value]) => `${key}: ${value}`)
          .join(' | ') || tr('لا توجد بيانات', 'No data'),
    },
    {
      key: 'actions',
      label: tr('الإجراءات', 'Actions'),
      render: (row) => (
        <button className="btn-secondary px-3 py-2 text-xs" onClick={() => openEditForm(row.id)} type="button">
          {tr('تعديل', 'Edit')}
        </button>
      ),
    },
  ]

  const activeKey = form.watch('key')
  const activeDefinition = safeSettingDefinitions.find((definition) => definition.key === activeKey)

  return (
    <div className="page-section space-y-6">
      <PageHeader
        description={tr(
          'هذه الشاشة مخصصة لإعدادات النظام الآمنة فقط. إدارة الخدمات والفئات والمستخدمين نُقلت إلى شاشاتها المتخصصة حتى لا تتكرر نفس العمليات في أكثر من مكان.',
          'This screen is for safe system settings only. Service, category and user management moved to their dedicated screens so the same operations are not duplicated in more than one place.',
        )}
        eyebrow={tr('إعدادات النظام', 'System settings')}
        icon={Database}
        title={tr('إعدادات النظام', 'System Settings')}
        actions={
          <button
            className="btn-primary"
            disabled={!creatableSettings.length}
            onClick={openCreateForm}
            type="button"
          >
            {tr('+ إعداد جديد', '+ New setting')}
          </button>
        }
      />

      <section className="glass-panel grid gap-4 p-5 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-border bg-slate-50/70 p-5">
          <p className="text-sm font-bold text-ink">{tr('تنظيم أوضح', 'Clearer organisation')}</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {tr(
              'تم إخراج الخدمات والفئات والمستخدمين من هذه الشاشة لأن لها صفحات إدارة مستقلة. هذا يمنع التكرار ويجعل كل شاشة مسؤولة عن بياناتها فقط.',
              'Services, categories and users were removed from this screen because they have their own management pages. This prevents duplication and keeps each screen responsible for its own data only.',
            )}
          </p>
        </div>
        <div className="rounded-3xl border border-border bg-slate-50/70 p-5">
          <div className="flex items-start gap-3">
            <span className="icon-chip">
              <Settings2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">{tr('ملاحظة تشغيلية', 'Operational note')}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {tr(
                  'حذف إعدادات النظام غير متاح من الواجهة لأن هذه المفاتيح مقيدة من الخلفية. المتاح هنا هو الإنشاء للمفاتيح الناقصة والتعديل على القيم الآمنة فقط.',
                  'Deleting system settings is not available from the UI because these keys are restricted on the backend. What is available here is creating missing keys and editing safe values only.',
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="glass-panel p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-ink">{tr('حماية الحذف', 'Delete protection')}</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              {tr(
                'لا يمكن حذف أو تعطيل أي سجل من داخل النظام إلا من خلال حساب المشرف وباستخدام كلمة مرور الحذف الإضافية.',
                'No record can be deleted or deactivated from inside the system except through an admin account and using the extra delete password.',
              )}
            </p>
            <p className="mt-2 text-xs font-semibold text-slate-500">
              {deleteGuard?.is_configured
                ? tr('كلمة مرور الحذف مفعلة.', 'The delete password is enabled.')
                : tr('لم يتم ضبط كلمة مرور الحذف بعد.', 'The delete password has not been set yet.')}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-slate-50 px-4 py-3 text-xs text-slate-500">
            {tr(
              'كلمة المرور هذه ستُطلب قبل أي عملية حذف أو إيقاف من شاشات الإدارة.',
              'This password will be requested before any delete or deactivate action from the admin screens.',
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label={tr('كلمة مرور الحذف', 'Delete password')} hint={tr('استخدم كلمة قوية يعرفها المشرف فقط.', 'Use a strong password known only to the admin.')}>
            <input
              className="field"
              type="password"
              value={deleteGuardForm.delete_password}
              onChange={(event) => setDeleteGuardForm({ ...deleteGuardForm, delete_password: event.target.value })}
            />
          </Field>
          <Field label={tr('تأكيد كلمة المرور', 'Confirm password')} hint={tr('يجب أن تتطابق القيمتان قبل الحفظ.', 'The two values must match before saving.')}>
            <input
              className="field"
              type="password"
              value={deleteGuardForm.confirm_delete_password}
              onChange={(event) => setDeleteGuardForm({ ...deleteGuardForm, confirm_delete_password: event.target.value })}
            />
          </Field>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button className="btn-primary" onClick={handleDeleteGuardSave} type="button">
            {tr('حفظ كلمة مرور الحذف', 'Save delete password')}
          </button>
          <button className="btn-secondary" onClick={() => setDeleteGuardForm(defaultDeleteGuardForm)} type="button">
            {tr('مسح الحقول', 'Clear fields')}
          </button>
        </div>
      </section>

      <DataTable
        columns={columns}
        emptyDescription={tr('أضف إعداداً آمناً جديداً إذا كان أحد مفاتيح النظام العامة غير موجود بعد.', 'Add a new safe setting if one of the public system keys does not exist yet.')}
        emptyTitle={tr('لا توجد إعدادات نظام', 'No system settings')}
        loading={loading}
        rows={settings}
      />

      <FormModal
        description={selectedSetting ? tr('عدّل الحقول الآمنة لهذا الإعداد فقط.', 'Edit the safe fields for this setting only.') : tr('أنشئ مفتاحاً آمناً مفقوداً من النظام.', 'Create a safe key missing from the system.')}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn-secondary" onClick={closeForm} type="button">
              {tr('إلغاء', 'Cancel')}
            </button>
            <button className="btn-primary min-w-40" disabled={submitting} form="system-setting-form" type="submit">
              {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {selectedSetting ? tr('حفظ التعديلات', 'Save changes') : tr('إضافة الإعداد', 'Add setting')}
            </button>
          </div>
        }
        onClose={closeForm}
        open={isFormOpen}
        size="lg"
        title={selectedSetting ? selectedSetting.label || selectedSetting.key : tr('إعداد نظام جديد', 'New system setting')}
      >
        <form className="space-y-5" id="system-setting-form" onSubmit={form.handleSubmit(handleSubmit)}>
          <Field label={tr('المفتاح', 'Key')}>
            <select className="field" disabled={Boolean(selectedSetting)} {...form.register('key', { required: true })}>
              <option value="">{tr('اختر الإعداد', 'Select setting')}</option>
              {selectedSetting ? (
                <option value={selectedSetting.key}>{selectedSetting.label || selectedSetting.key}</option>
              ) : (
                creatableSettings.map((setting) => (
                  <option key={setting.key} value={setting.key}>
                    {definitionLabel(setting, isArabic)}
                  </option>
                ))
              )}
            </select>
          </Field>

          <Field label={tr('وصف داخلي', 'Internal description')}>
            <input className="field" {...form.register('description')} />
          </Field>

          {activeDefinition ? (
            <div className="rounded-3xl border border-border bg-slate-50/70 p-5">
              <p className="text-sm font-bold text-ink">{definitionLabel(activeDefinition, isArabic)}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{definitionDescription(activeDefinition, isArabic)}</p>
            </div>
          ) : null}

          <div className="space-y-4">
            <SettingFields form={form} isArabic={isArabic} selectedSetting={selectedSetting} settingKey={activeKey} />
          </div>
        </form>
      </FormModal>
    </div>
  )
}

export default AdminCmsPage
