import { CheckCircle2, FilePlus2, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import ContextHelpButton from '../../components/ContextHelpButton'
import FileUploader from '../../components/FileUploader'
import DynamicServiceFields from '../../components/DynamicServiceFields'
import InlineHelp, { HelpLabel } from '../../components/InlineHelp'
import PageHeader from '../../components/PageHeader'
import { api } from '../../api/services'
import { useAuth } from '../../context/AuthContext'
import { useRegisterPageHelp } from '../../context/HelpGuideContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import {
  buildBaseDraftValues,
  draftStorageKey,
  parseStoredDraft,
  serializeDraft,
} from './orderDrafts'
import { formatCurrency } from '../../utils/format'
import {
  applyServerFieldErrors,
  buildAcceptValue,
  buildDynamicNotes,
  buildUploadHint,
  getDocumentFieldName,
  getRequiredDocumentLabel,
  getRequiredDocumentType,
  getServiceSchemaFields,
  validateMultipleFiles,
  validateSingleFileList,
} from '../../utils/serviceForms'

function CustomerCreateOrderPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const [submittedOrder, setSubmittedOrder] = useState(null)
  const { data: categories = [] } = useAsyncData(() => api.getCategories(), [], [])
  const { data: services = [] } = useAsyncData(() => api.getServices(), [], [])
  const requestedServiceId = searchParams.get('service') || ''
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm({
    defaultValues: {
      category_slug: '',
      service: requestedServiceId,
      full_name: user?.full_name || '',
      phone: user?.phone || '',
      national_id: user?.national_id || '',
      city: '',
      notes: '',
      consent: true,
    },
  })
  const selectedCategorySlug = watch('category_slug')
  const filteredServices = selectedCategorySlug
    ? services.filter((service) => service.category?.slug === selectedCategorySlug)
    : services
  const selectedService = services.find((service) => String(service.id) === String(watch('service')))
  const { data: selectedServiceDetails } = useAsyncData(
    () => (selectedService?.slug ? api.getService(selectedService.slug) : Promise.resolve(null)),
    [selectedService?.slug],
    null,
  )
  const requiredDocuments = selectedServiceDetails?.required_documents || []
  const schemaFields = getServiceSchemaFields(selectedServiceDetails)
  useRegisterPageHelp({ serviceId: selectedService?.id || '' })

  useEffect(() => {
    const storedDraft = localStorage.getItem(draftStorageKey)
    const baseValues = buildBaseDraftValues({ requestedServiceId, user })

    if (storedDraft) {
      try {
        const { values: parsedDraft, message } = parseStoredDraft(storedDraft)
        if (message) {
          localStorage.removeItem(draftStorageKey)
          toast(message, 'info')
        }

        if (parsedDraft) {
          reset({
            ...baseValues,
            ...parsedDraft,
            service: requestedServiceId || parsedDraft.service || '',
            consent: true,
          })
          return
        }
      } catch {
        localStorage.removeItem(draftStorageKey)
        toast('تعذر استعادة المسودة المحفوظة وتمت إزالتها. يمكنك المتابعة ببيانات جديدة.', 'info')
      }
    }

    reset(baseValues)
  }, [requestedServiceId, reset, toast, user])

  useEffect(() => {
    if (!requestedServiceId || !selectedService?.category?.slug) return
    const currentValues = watch()
    if (currentValues.category_slug === selectedService.category.slug) return
    reset({
      ...currentValues,
      category_slug: selectedService.category.slug,
    })
  }, [requestedServiceId, reset, selectedService, watch])

  useEffect(() => {
    if (!selectedCategorySlug || !selectedService) return
    if (selectedService.category?.slug === selectedCategorySlug) return
    const currentValues = watch()
    reset({
      ...currentValues,
      service: '',
    })
  }, [reset, selectedCategorySlug, selectedService, watch])

  async function onSubmit(values) {
    clearErrors('root.server')

    const formData = new FormData()
    formData.append('service', values.service)
    formData.append('full_name', values.full_name)
    formData.append('phone', values.phone)
    formData.append('national_id', values.national_id || '')
    formData.append('city', values.city)
    formData.append('notes', buildDynamicNotes(values.notes, schemaFields, values))
    formData.append('consent', values.consent ? 'true' : 'false')

    if (requiredDocuments.length) {
      requiredDocuments.forEach((document, index) => {
        const documentType = getRequiredDocumentType(document, index)
        const file = values[getDocumentFieldName(document, index)]?.[0]
        if (file) {
          formData.append('document_types', documentType)
          formData.append('documents', file)
        }
      })
    } else {
      Array.from(values.documents || []).forEach((file) => formData.append('documents', file))
    }

    try {
      const result = await api.createOrder(formData)
      setSubmittedOrder(result)
      toast('تم إرسال الطلب بنجاح، ويمكنك متابعته من شاشة طلباتي.', 'success')
      ;(result.warnings || []).forEach((warning) => {
        toast(warning, 'info')
      })
      localStorage.removeItem(draftStorageKey)
      reset({
        category_slug: selectedService?.category?.slug || '',
        service: requestedServiceId,
        full_name: user?.full_name || '',
        phone: user?.phone || '',
        national_id: user?.national_id || '',
        city: '',
        notes: '',
        consent: true,
      })
    } catch (submitError) {
      applyServerFieldErrors({
        error: submitError,
        setError,
        documents: requiredDocuments,
        fallbackField: 'root.server',
        fieldNameForDocumentIndex: (index, document) => getDocumentFieldName(document, index),
      })
    }
  }

  function saveDraft() {
    const values = { ...watch() }
    delete values.documents
    Object.keys(values).forEach((key) => {
      if (key.startsWith('document_')) {
        delete values[key]
      }
    })
    localStorage.setItem(draftStorageKey, serializeDraft(values))
    toast('تم حفظ المسودة محلياً على هذا الجهاز.', 'info')
  }

  const requiredDocumentLabels = requiredDocuments.map((document) => getRequiredDocumentLabel(document)).filter(Boolean)

  return (
    <div className="page-section">
      <PageHeader
        actions={
          <>
            <ContextHelpButton label="Open help for creating a new service request" />
            <button className="btn-secondary" onClick={saveDraft} type="button">
              <Save className="h-4 w-4" />
              حفظ كمسودة
            </button>
            <InlineHelp actionKey="save_draft" className="self-center" />
            <button className="btn-primary" form="client-create-order" type="submit">
              <CheckCircle2 className="h-4 w-4" />
              إرسال الطلب
            </button>
            <InlineHelp actionKey="submit_order" className="self-center" />
          </>
        }
        description="أدخل الخدمة المطلوبة، راجع الوثائق الإلزامية، ثم أرسل الطلب إلى فريق العمليات. تم تنظيم الشاشة وفق معيار العميل في ملف التوحيد."
        eyebrow="بوابة العميل"
        icon={FilePlus2}
        title="طلب خدمة جديد"
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <form className="glass-panel space-y-6 p-6" id="client-create-order" onSubmit={handleSubmit(onSubmit)}>
          <section className="panel-muted p-5">
            <p className="text-sm font-bold text-brand-600">الخطوة 1</p>
            <h2 className="mt-1 text-xl font-bold text-ink">اختيار تصنيف الخدمة</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-ink">
                  <HelpLabel fieldKey="category_slug">تصنيف الخدمة</HelpLabel>
                </label>
                <select className="field" {...register('category_slug', { required: 'اختر تصنيف الخدمة' })}>
                  <option value="">اختر التصنيف</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.slug}>
                      {category.full_path_name || category.name_ar}
                    </option>
                  ))}
                </select>
                {errors.category_slug ? <p className="mt-2 text-sm text-danger">{errors.category_slug.message}</p> : null}
              </div>
            </div>
          </section>

          <section className="panel-muted p-5">
            <p className="text-sm font-bold text-brand-600">الخطوة 2</p>
            <h2 className="mt-1 text-xl font-bold text-ink">اختيار الخدمة والبيانات الأساسية</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-ink">
                  <HelpLabel fieldKey="service">الخدمة</HelpLabel>
                </label>
                <select className="field" {...register('service', { required: 'اختر الخدمة المطلوبة' })}>
                  <option value="">اختر الخدمة</option>
                  {filteredServices.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name_ar}
                    </option>
                  ))}
                </select>
                {errors.service ? <p className="mt-2 text-sm text-danger">{errors.service.message}</p> : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink">
                  <HelpLabel fieldKey="full_name">الاسم الكامل</HelpLabel>
                </label>
                <input className="field" {...register('full_name', { required: 'الاسم الكامل مطلوب' })} />
                {errors.full_name ? <p className="mt-2 text-sm text-danger">{errors.full_name.message}</p> : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink">
                  <HelpLabel fieldKey="phone">رقم الهاتف</HelpLabel>
                </label>
                <input className="field" {...register('phone', { required: 'رقم الهاتف مطلوب' })} />
                {errors.phone ? <p className="mt-2 text-sm text-danger">{errors.phone.message}</p> : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink">
                  <HelpLabel fieldKey="national_id">الرقم الوطني</HelpLabel>
                </label>
                <input className="field" {...register('national_id')} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink">
                  <HelpLabel fieldKey="city">المدينة</HelpLabel>
                </label>
                <input className="field" {...register('city', { required: 'المدينة مطلوبة' })} />
                {errors.city ? <p className="mt-2 text-sm text-danger">{errors.city.message}</p> : null}
              </div>
            </div>
          </section>

          {schemaFields.length ? (
            <section className="panel-muted p-5">
              <p className="text-sm font-bold text-brand-600">الخطوة 3</p>
              <h2 className="mt-1 text-xl font-bold text-ink">البيانات الإضافية المطلوبة</h2>
              <div className="mt-5">
                <DynamicServiceFields errors={errors} register={register} service={selectedServiceDetails} />
              </div>
            </section>
          ) : null}

          <section className="panel-muted p-5">
            <p className="text-sm font-bold text-brand-600">{schemaFields.length ? 'الخطوة 4' : 'الخطوة 3'}</p>
            <h2 className="mt-1 text-xl font-bold text-ink">الوثائق والملاحظات</h2>
            <div className="mt-5 space-y-4">
              {requiredDocuments.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                {requiredDocuments.map((document, index) => {
                    const fieldName = getDocumentFieldName(document, index)
                    const label = getRequiredDocumentLabel(document)

                    return (
                      <FileUploader
                        key={fieldName}
                        accept={buildAcceptValue(document)}
                        error={errors[fieldName]}
                        hint={buildUploadHint(document)}
                        label={<HelpLabel fieldKey="documents">{label}</HelpLabel>}
                        registration={register(fieldName, {
                          validate: (fileList) =>
                            validateSingleFileList(
                              fileList,
                              document,
                              document?.is_required === false ? undefined : `الملف ${label} مطلوب`,
                            ),
                        })}
                      />
                    )
                  })}
                </div>
              ) : (
                <FileUploader
                  accept={buildAcceptValue()}
                  error={errors.documents}
                  hint={buildUploadHint()}
                  label={<HelpLabel fieldKey="documents">رفع الوثائق</HelpLabel>}
                  multiple
                  name="documents"
                  register={register}
                  registration={register('documents', {
                    validate: (fileList) => validateMultipleFiles(fileList),
                  })}
                />
              )}
              <div>
                <label className="mb-2 block text-sm font-semibold text-ink">
                  <HelpLabel fieldKey="notes">ملاحظات إضافية</HelpLabel>
                </label>
                <textarea className="field min-h-28" {...register('notes')} />
              </div>
              <label className="flex items-start gap-3 rounded-3xl border border-border bg-white px-4 py-4 text-sm">
                <input className="mt-1" type="checkbox" {...register('consent', { required: 'يجب الموافقة على الشروط' })} />
                <span className="inline-flex items-center gap-2">
                  <span>أوافق على استخدام الوثائق والبيانات لإتمام الخدمة فقط وإشعاري بأي نواقص مطلوبة.</span>
                  <InlineHelp fieldKey="consent" title="الموافقة" />
                </span>
              </label>
              {errors.consent ? <p className="text-sm text-danger">{errors.consent.message}</p> : null}
              {errors.root?.server ? <p className="text-sm text-danger">{errors.root.server.message}</p> : null}
            </div>
          </section>

        </form>

        <aside className="space-y-6">
          <div className="glass-panel p-6">
            <p className="text-sm font-bold text-brand-600">ملخص الخدمة</p>
            <h2 className="mt-2 text-xl font-bold text-ink">{selectedService?.name_ar || 'اختر خدمة لعرض ملخصها'}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{selectedService?.description_ar || 'سيظهر هنا وصف الخدمة المختارة.'}</p>
            <div className="mt-5 grid gap-3">
              <div className="panel-muted p-4">
                <p className="text-xs text-slate-500">السعر الإجمالي</p>
                <p className="mt-2 font-bold text-ink">
                  {selectedService ? formatCurrency(selectedService.total_fee) : 'غير محدد'}
                </p>
              </div>
              <div className="panel-muted p-4">
                <p className="text-xs text-slate-500">المدة المتوقعة</p>
                <p className="mt-2 font-bold text-ink">
                  {selectedService ? `${selectedService.estimated_duration} ${selectedService.estimated_duration_unit || 'days'}` : 'غير محدد'}
                </p>
              </div>
            </div>
          </div>

          {selectedServiceDetails?.prerequisite_services?.length ? (
            <div className="glass-panel p-6">
              <p className="text-sm font-bold text-brand-600">المتطلبات السابقة</p>
              <div className="mt-4 space-y-3">
                {selectedServiceDetails.prerequisite_services.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-border px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-ink">{item.source_service?.name_ar}</span>
                      <span className={`text-xs font-semibold ${item.is_completed ? 'text-green-700' : 'text-amber-700'}`}>
                        {item.is_completed ? 'مكتملة' : 'غير مكتملة'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {selectedServiceDetails?.recommended_services?.length ? (
            <div className="glass-panel p-6">
              <p className="text-sm font-bold text-brand-600">خدمات مرتبطة مقترحة</p>
              <div className="mt-4 space-y-3">
                {selectedServiceDetails.recommended_services.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-border px-4 py-3 text-sm text-ink">
                    {item.target_service?.name_ar}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="glass-panel p-6">
            <p className="text-sm font-bold text-brand-600">الوثائق المطلوبة</p>
            <div className="mt-4 space-y-3">
              {(requiredDocumentLabels.length ? requiredDocumentLabels : ['اختر خدمة أولاً']).map((document) => (
                <div key={document} className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3">
                  <span className="icon-chip h-9 w-9 rounded-xl">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium text-ink">{document}</span>
                </div>
              ))}
            </div>
          </div>

          {submittedOrder ? (
            <div className="glass-panel border-green-200 bg-green-50 p-6">
              <p className="font-bold text-green-800">تم استلام الطلب</p>
              <p className="mt-2 text-sm text-green-700">رقم الطلب: {submittedOrder.order_number}</p>
              {submittedOrder.warnings?.length ? (
                <div className="mt-4 space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  {submittedOrder.warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  )
}

export default CustomerCreateOrderPage
