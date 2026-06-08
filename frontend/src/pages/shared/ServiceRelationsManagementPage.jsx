import { GitBranchPlus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import ConfirmModal from '../../components/ConfirmModal'
import DataTable from '../../components/DataTable'
import FormModal from '../../components/FormModal'
import PageHeader from '../../components/PageHeader'
import { getDisplayError } from '../../api/client'
import { api } from '../../api/services'
import { useLanguage } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'

const relationTypeOptions = [
  {
    value: 'prerequisite',
    label: 'Required Before',
    label_ar: 'شرط مسبق',
    help: 'The source service should be completed before the target service can move forward.',
    help_ar: 'يجب إتمام الخدمة المصدر قبل أن تتمكن الخدمة الهدف من المضي قدماً.',
  },
  {
    value: 'recommended_after',
    label: 'Recommended After Completion',
    label_ar: 'موصى بها بعد الإتمام',
    help: 'Suggest the target service after the source service is completed.',
    help_ar: 'اقترح الخدمة الهدف بعد إتمام الخدمة المصدر.',
  },
  {
    value: 'optional_bundle',
    label: 'Optional Bundle',
    label_ar: 'حزمة اختيارية',
    help: 'Offer the target service as an optional add-on connected to the source service.',
    help_ar: 'اعرض الخدمة الهدف كإضافة اختيارية مرتبطة بالخدمة المصدر.',
  },
  {
    value: 'alternative',
    label: 'Alternative Option',
    label_ar: 'خيار بديل',
    help: 'Present the target service as an alternative path instead of the source service.',
    help_ar: 'اعرض الخدمة الهدف كمسار بديل عوضاً عن الخدمة المصدر.',
  },
]

const defaultValues = {
  source_category_id: '',
  source_service_id: '',
  target_category_id: '',
  target_service_id: '',
  relation_type: 'prerequisite',
  is_required: true,
  message_to_customer: '',
  is_active: true,
}

function Field({ label, hint, children }) {
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

function CheckboxField({ label, registration, hint }) {
  return (
    <label className="space-y-2">
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
      <span className="flex items-center justify-between rounded-2xl border border-border bg-brand-50/40 px-4 py-3 text-sm font-medium text-ink">
        <span>{label}</span>
        <input className="h-4 w-4 accent-brand-600" type="checkbox" {...registration} />
      </span>
    </label>
  )
}

function ServiceRelationsManagementPage() {
  const { isArabic } = useLanguage()
  const { toast } = useToast()
  const form = useForm({ defaultValues })
  const [selectedRelationId, setSelectedRelationId] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [pendingDeactivate, setPendingDeactivate] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [filters, setFilters] = useState({
    source_service: '',
    target_service: '',
    relation_type: '',
    is_active: 'true',
  })

  const { data: services = [], loading: servicesLoading } = useAsyncData(() => api.getAdminServices(), [], [])
  const { data: categories = [] } = useAsyncData(() => api.getAdminCategories(), [], [])
  const { data: relations = [], loading: relationsLoading, reload } = useAsyncData(
    () => api.getAdminServiceRelations(filters),
    [filters.source_service, filters.target_service, filters.relation_type, filters.is_active],
    [],
  )

  const activeServices = useMemo(
    () => services.filter((service) => service.is_active !== false),
    [services],
  )
  const sourceCategoryId = form.watch('source_category_id')
  const targetCategoryId = form.watch('target_category_id')
  const sourceServices = sourceCategoryId
    ? activeServices.filter((service) => String(service.category?.id) === String(sourceCategoryId))
    : activeServices
  const targetServices = targetCategoryId
    ? activeServices.filter((service) => String(service.category?.id) === String(targetCategoryId))
    : activeServices
  const selectedRelation = useMemo(
    () => relations.find((relation) => String(relation.id) === String(selectedRelationId)) || null,
    [relations, selectedRelationId],
  )
  const selectedRelationType = form.watch('relation_type')
  const selectedTypeMeta = relationTypeOptions.find((item) => item.value === selectedRelationType) || relationTypeOptions[0]

  useEffect(() => {
    form.reset(
      selectedRelation
        ? {
            source_category_id: selectedRelation.source_service?.category?.id || '',
            source_service_id: String(selectedRelation.source_service?.id || selectedRelation.source_service_id || ''),
            target_category_id: selectedRelation.target_service?.category?.id || '',
            target_service_id: String(selectedRelation.target_service?.id || selectedRelation.target_service_id || ''),
            relation_type: selectedRelation.relation_type || 'prerequisite',
            is_required: Boolean(selectedRelation.is_required),
            message_to_customer: selectedRelation.message_to_customer || '',
            is_active: Boolean(selectedRelation.is_active),
          }
        : defaultValues,
    )
  }, [form, selectedRelation])

  function openCreateForm() {
    setSelectedRelationId(null)
    form.reset(defaultValues)
    setIsFormOpen(true)
  }

  function openEditForm(id) {
    setSelectedRelationId(id)
    setIsFormOpen(true)
  }

  function closeForm() {
    setIsFormOpen(false)
    setSelectedRelationId(null)
    form.reset(defaultValues)
  }

  async function handleSubmit(values) {
    setSubmitting(true)
    try {
      const payload = {
        source_service_id: Number(values.source_service_id),
        target_service_id: Number(values.target_service_id),
        relation_type: values.relation_type,
        is_required: values.relation_type === 'prerequisite' ? Boolean(values.is_required) : false,
        message_to_customer: values.message_to_customer.trim(),
        is_active: Boolean(values.is_active),
      }

      if (selectedRelation) {
        await api.updateAdminServiceRelation(selectedRelation.id, payload)
        toast(isArabic ? 'تم تحديث العلاقة.' : 'Service relation updated.', 'success')
      } else {
        await api.createAdminServiceRelation(payload)
        toast(isArabic ? 'تم إنشاء العلاقة.' : 'Service relation created.', 'success')
      }

      reload()
      closeForm()
    } catch (error) {
      toast(getDisplayError(error), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeactivateConfirm() {
    if (!pendingDeactivate) return

    const relationId = pendingDeactivate.id
    setPendingDeactivate(null)

    try {
      await api.deleteAdminServiceRelation(relationId)
      toast(isArabic ? 'تم إيقاف العلاقة.' : 'Service relation deactivated.', 'success')
      reload()
      if (String(selectedRelationId) === String(relationId)) {
        closeForm()
      }
    } catch (error) {
      toast(getDisplayError(error), 'error')
    }
  }

  const columns = [
    {
      key: 'source_service_name',
      label: isArabic ? 'الخدمة المصدر' : 'Source Service',
      render: (row) => row.source_service_name || row.source_service?.name_ar || (isArabic ? 'غير معروف' : 'Unknown'),
    },
    {
      key: 'target_service_name',
      label: isArabic ? 'الخدمة الهدف' : 'Target Service',
      render: (row) => row.target_service_name || row.target_service?.name_ar || (isArabic ? 'غير معروف' : 'Unknown'),
    },
    { key: 'relation_type_label', label: isArabic ? 'نوع القاعدة' : 'Rule Type' },
    {
      key: 'is_required',
      label: isArabic ? 'الإلزامية' : 'Requirement',
      render: (row) => (row.is_required ? (isArabic ? 'إلزامي' : 'Required') : (isArabic ? 'اختياري' : 'Optional')),
    },
    {
      key: 'is_active',
      label: isArabic ? 'الحالة' : 'Status',
      render: (row) => (row.is_active ? (isArabic ? 'مفعّل' : 'Active') : (isArabic ? 'موقف' : 'Inactive')),
    },
    {
      key: 'actions',
      label: isArabic ? 'الإجراءات' : 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => openEditForm(row.id)} type="button">
            {isArabic ? 'تعديل' : 'Edit'}
          </button>
          <button
            className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger"
            onClick={() => setPendingDeactivate(row)}
            type="button"
          >
            {isArabic ? 'إيقاف' : 'Deactivate'}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="page-section space-y-6">
      <PageHeader
        title={isArabic ? 'إدارة علاقات الخدمات' : 'Service Relations Management'}
        eyebrow={isArabic ? 'قواعد الخدمات' : 'Service Rules'}
        icon={GitBranchPlus}
        description={isArabic ? 'عرّف الشروط المسبقة والتوصيات اللاحقة والحزم الاختيارية والبدائل بدون تعديل برمجي.' : 'Define prerequisites, recommendations, optional bundles, and alternatives without code changes.'}
        actions={
          <button className="btn-primary" onClick={openCreateForm} type="button">
            {isArabic ? '+ علاقة جديدة' : '+ New Relation'}
          </button>
        }
      />

      <section className="glass-panel grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
        {relationTypeOptions.map((item) => (
          <div key={item.value} className="rounded-3xl border border-border bg-slate-50/70 p-4">
            <p className="text-sm font-bold text-ink">{isArabic ? item.label_ar : item.label}</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">{isArabic ? item.help_ar : item.help}</p>
          </div>
        ))}
      </section>

      <DataTable
        columns={columns}
        rows={relations}
        loading={relationsLoading || servicesLoading}
        emptyTitle={isArabic ? 'لا توجد علاقات خدمات' : 'No service relations found'}
        emptyDescription={isArabic ? 'أنشئ أول قاعدة أعمال لربط الخدمات.' : 'Create the first business rule to connect services.'}
        toolbar={
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <select
              className="field"
              value={filters.source_service}
              onChange={(event) => setFilters((current) => ({ ...current, source_service: event.target.value }))}
            >
              <option value="">{isArabic ? 'جميع الخدمات المصدر' : 'All source services'}</option>
              {activeServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name_ar}
                </option>
              ))}
            </select>

            <select
              className="field"
              value={filters.target_service}
              onChange={(event) => setFilters((current) => ({ ...current, target_service: event.target.value }))}
            >
              <option value="">{isArabic ? 'جميع الخدمات الهدف' : 'All target services'}</option>
              {activeServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name_ar}
                </option>
              ))}
            </select>

            <select
              className="field"
              value={filters.relation_type}
              onChange={(event) => setFilters((current) => ({ ...current, relation_type: event.target.value }))}
            >
              <option value="">{isArabic ? 'جميع أنواع القواعد' : 'All rule types'}</option>
              {relationTypeOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {isArabic ? item.label_ar : item.label}
                </option>
              ))}
            </select>

            <select
              className="field"
              value={filters.is_active}
              onChange={(event) => setFilters((current) => ({ ...current, is_active: event.target.value }))}
            >
              <option value="">{isArabic ? 'جميع الحالات' : 'All statuses'}</option>
              <option value="true">{isArabic ? 'المفعّلة فقط' : 'Active only'}</option>
              <option value="false">{isArabic ? 'الموقوفة فقط' : 'Inactive only'}</option>
            </select>
          </div>
        }
        mobileCard={(row) => (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold text-ink">{row.source_service_name || row.source_service?.name_ar}</p>
              <span className="text-sm text-slate-500">{row.is_active ? (isArabic ? 'مفعّل' : 'Active') : (isArabic ? 'موقف' : 'Inactive')}</span>
            </div>
            <p className="text-sm text-slate-600">{isArabic ? 'الهدف: ' : 'Target: '}{row.target_service_name || row.target_service?.name_ar}</p>
            <p className="text-sm text-slate-500">{row.relation_type_label}</p>
          </div>
        )}
      />

      <FormModal
        open={isFormOpen}
        onClose={closeForm}
        size="lg"
        title={selectedRelation ? (isArabic ? 'تعديل العلاقة' : 'Edit Service Relation') : (isArabic ? 'علاقة جديدة' : 'New Service Relation')}
        description={isArabic ? 'استخدم قواعد الأعمال لتمكين فريق التشغيل من التحكم في تبعيات الخدمات واقتراحات المتابعة.' : 'Use business-friendly rules so operations teams can control service dependencies and follow-up suggestions.'}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn-secondary" onClick={closeForm} type="button">
              {isArabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button className="btn-primary min-w-40" disabled={submitting} form="service-relation-form" type="submit">
              {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {selectedRelation ? (isArabic ? 'حفظ التعديلات' : 'Save Changes') : (isArabic ? 'إنشاء العلاقة' : 'Create Relation')}
            </button>
          </div>
        }
      >
        <form className="space-y-5" id="service-relation-form" onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label={isArabic ? 'الخدمة المصدر' : 'Source service'}
              hint={isArabic ? 'هذه الخدمة تبدأ العلاقة التجارية.' : 'This service starts the business relationship.'}
            >
              <select className="field" {...form.register('source_service_id', { required: true })}>
                <option value="">{isArabic ? 'اختر الخدمة المصدر' : 'Select source service'}</option>
                {sourceServices.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name_ar}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label={isArabic ? 'الخدمة الهدف' : 'Target service'}
              hint={isArabic ? 'هذه الخدمة تعتمد على الخدمة المصدر أو تُقترح بعدها.' : 'This service depends on or is suggested after the source service.'}
            >
              <select className="field" {...form.register('target_service_id', { required: true })}>
                <option value="">{isArabic ? 'اختر الخدمة الهدف' : 'Select target service'}</option>
                {targetServices.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name_ar}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label={isArabic ? 'تصنيف الخدمة المصدر' : 'Source category'}
              hint={isArabic ? 'فلترة قائمة الخدمة المصدر حسب التصنيف.' : 'Filter the source service list by category.'}
            >
              <select className="field" {...form.register('source_category_id')}>
                <option value="">{isArabic ? 'جميع التصنيفات' : 'All categories'}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.full_path_name || category.name_ar}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label={isArabic ? 'تصنيف الخدمة الهدف' : 'Target category'}
              hint={isArabic ? 'فلترة قائمة الخدمة الهدف حسب التصنيف.' : 'Filter the target service list by category.'}
            >
              <select className="field" {...form.register('target_category_id')}>
                <option value="">{isArabic ? 'جميع التصنيفات' : 'All categories'}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.full_path_name || category.name_ar}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field
            label={isArabic ? 'نوع القاعدة' : 'Rule type'}
            hint={isArabic ? 'اختر المعنى التجاري للعلاقة.' : 'Choose the business meaning of the relationship.'}
          >
            <select className="field" {...form.register('relation_type', { required: true })}>
              {relationTypeOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {isArabic ? item.label_ar : item.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="rounded-3xl border border-brand-100 bg-brand-50/70 p-4 text-sm leading-7 text-slate-600">
            <p className="font-semibold text-ink">{isArabic ? selectedTypeMeta.label_ar : selectedTypeMeta.label}</p>
            <p className="mt-1">{isArabic ? selectedTypeMeta.help_ar : selectedTypeMeta.help}</p>
          </div>

          {selectedRelationType === 'prerequisite' ? (
            <CheckboxField
              label={isArabic ? 'هذا الشرط إلزامي' : 'This prerequisite is mandatory'}
              hint={isArabic ? 'الشروط الإلزامية تمنع إرسال الطلب حتى تُكتمل الخدمة المصدر.' : 'Mandatory prerequisites block ordering until the source service is completed.'}
              registration={form.register('is_required')}
            />
          ) : null}

          <Field
            label={isArabic ? 'رسالة للعميل' : 'Customer message'}
            hint={isArabic ? 'ملاحظة اختيارية بلغة بسيطة تُعرض للعملاء في تفاصيل الخدمة والإشعارات.' : 'Optional plain-language note shown to customers in the service details and notifications.'}
          >
            <textarea className="field min-h-28" {...form.register('message_to_customer')} />
          </Field>

          <CheckboxField
            label={isArabic ? 'العلاقة مفعّلة' : 'Relation is active'}
            hint={isArabic ? 'العلاقات الموقوفة تبقى في السجل لكنها لا تؤثر على الطلبات والتوصيات.' : 'Inactive relations stay in history but are ignored by ordering and recommendations.'}
            registration={form.register('is_active')}
          />
        </form>
      </FormModal>

      <ConfirmModal
        open={!!pendingDeactivate}
        onClose={() => setPendingDeactivate(null)}
        onConfirm={handleDeactivateConfirm}
        title={isArabic ? 'إيقاف العلاقة' : 'Deactivate Service Relation'}
        description={isArabic ? 'ستتوقف القاعدة عن التأثير على الطلبات والتوصيات، لكن السجل التاريخي سيبقى محفوظاً.' : 'The rule will stop affecting ordering and recommendations, but the audit history will remain.'}
        confirmLabel={isArabic ? 'إيقاف' : 'Deactivate'}
        variant="danger"
      />
    </div>
  )
}

export default ServiceRelationsManagementPage
