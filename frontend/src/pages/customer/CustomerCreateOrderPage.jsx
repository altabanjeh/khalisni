import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, FilePlus2, FileText, Save, WalletCards } from 'lucide-react'
import { cloneElement, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import ApplicationStepper from '../../components/ApplicationStepper'
import DynamicServiceFields from '../../components/DynamicServiceFields'
import FileUploader from '../../components/FileUploader'
import { api } from '../../api/services'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { getServiceName, getServiceDescription, getServiceDuration, getServicePublicPrice } from '../../utils/servicePresentation'
import {
  buildBaseDraftValues,
  draftStorageKey,
  parseStoredDraft,
  serializeDraft,
} from './orderDrafts'
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

function StepPanel({ eyebrow, title, description, children }) {
  return (
    <section className="rounded-[var(--radius-xl)] border border-border bg-card p-5 shadow-soft sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-600">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-black text-ink sm:text-2xl">{title}</h2>
      {description ? <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">{description}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  )
}

function Field({ label, hint, error, required, children }) {
  const id = useId()
  const control = children && children.type ? cloneElement(children, { id, 'aria-invalid': error ? 'true' : undefined }) : children
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-ink" htmlFor={id}>
        {label}
        {required ? <span className="text-danger" aria-hidden="true">*</span> : null}
      </label>
      {control}
      {hint && !error ? <p className="mt-1 text-xs font-semibold text-slate-500">{hint}</p> : null}
      {error ? <p className="mt-1 text-xs font-bold text-danger" role="alert">{error.message}</p> : null}
    </div>
  )
}

function CustomerCreateOrderPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { language, isArabic } = useLanguage()
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState(0)
  const [submittedOrder, setSubmittedOrder] = useState(null)
  const [maxReached, setMaxReached] = useState(0)
  const topRef = useRef(null)

  const { data: categories = [] } = useAsyncData(() => api.getCategories(), [], [])
  const { data: services = [] } = useAsyncData(() => api.getServices(), [], [])
  const requestedServiceId = searchParams.get('service') || ''

  const {
    register,
    handleSubmit,
    watch,
    reset,
    trigger,
    getValues,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = useForm({
    mode: 'onTouched',
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
  const selectedServiceId = watch('service')
  const filteredServices = selectedCategorySlug
    ? services.filter((service) => service.category?.slug === selectedCategorySlug)
    : services
  const selectedService = services.find((service) => String(service.id) === String(selectedServiceId))
  const { data: selectedServiceDetails } = useAsyncData(
    () => (selectedService?.slug ? api.getService(selectedService.slug) : Promise.resolve(null)),
    [selectedService?.slug],
    null,
  )
  const requiredDocuments = selectedServiceDetails?.required_documents || []
  const schemaFields = getServiceSchemaFields(selectedServiceDetails)
  const startedFromService = Boolean(requestedServiceId && selectedService)

  const T = useMemo(
    () => (isArabic
      ? {
          steps: ['الخدمة', 'بيانات مقدّم الطلب', 'المستندات', 'المراجعة', 'تم الإرسال'],
          eyebrow: 'بوابة العميل',
          title: 'طلب خدمة جديد',
          desc: 'اختر الخدمة، أدخل بياناتك وارفع المستندات المطلوبة، ثم راجع وأرسل.',
          next: 'التالي', back: 'السابق', submit: 'إرسال الطلب', saveDraft: 'حفظ كمسودة',
          savedDraft: 'تم حفظ المسودة على هذا الجهاز.',
          sSummary: 'ملخص الخدمة', sPickFirst: 'اختر خدمة لعرض ملخصها.',
          price: 'السعر', duration: 'المدة المتوقعة', reqDocs: 'المستندات المطلوبة',
          checklist: 'قائمة الإكمال', of: 'من',
          category: 'تصنيف الخدمة', pickCategory: 'اختر التصنيف', service: 'الخدمة', pickService: 'اختر الخدمة',
          lockedFromService: 'تم اختيار هذه الخدمة من صفحة تفاصيل الخدمة.',
          fullName: 'الاسم الكامل', phone: 'رقم الهاتف', nationalId: 'الرقم الوطني', city: 'المدينة',
          extra: 'بيانات إضافية للخدمة',
          docsIntro: 'ارفع كل مستند مطلوب. الملفات المسموحة: PDF و JPG و PNG و DOC، بحد أقصى 10 ميغابايت.',
          generalUpload: 'ارفع المستندات الداعمة',
          notes: 'ملاحظات إضافية (اختياري)',
          consent: 'أوافق على استخدام بياناتي ومستنداتي لإنجاز هذه الخدمة فقط، وإشعاري بأي نواقص.',
          reviewIntro: 'تأكد من صحة كل شيء قبل الإرسال. يمكنك الرجوع لأي خطوة للتعديل.',
          edit: 'تعديل', notSet: 'غير محدد', docsUploaded: 'مرفوعة',
          successTitle: 'تم استلام طلبك', requestNo: 'رقم الطلب',
          successBody: 'سيراجع فريق خلصني طلبك ويحدّث حالته. تابعه من صفحة الطلب.',
          viewRequest: 'عرض تفاصيل الطلب', toDashboard: 'العودة إلى لوحتي', newRequest: 'طلب آخر',
          required: 'مطلوب', optional: 'اختياري',
        }
      : {
          steps: ['Service', 'Applicant', 'Documents', 'Review', 'Submitted'],
          eyebrow: 'Customer portal',
          title: 'New service request',
          desc: 'Choose the service, enter your details and upload the required documents, then review and submit.',
          next: 'Next', back: 'Back', submit: 'Submit request', saveDraft: 'Save draft',
          savedDraft: 'Draft saved on this device.',
          sSummary: 'Service summary', sPickFirst: 'Pick a service to see its summary.',
          price: 'Price', duration: 'Expected duration', reqDocs: 'Required documents',
          checklist: 'Completion checklist', of: 'of',
          category: 'Service category', pickCategory: 'Select a category', service: 'Service', pickService: 'Select a service',
          lockedFromService: 'This service was chosen from its detail page.',
          fullName: 'Full name', phone: 'Phone number', nationalId: 'National ID', city: 'City',
          extra: 'Additional service information',
          docsIntro: 'Upload every required document. Allowed: PDF, JPG, PNG, DOC — up to 10 MB.',
          generalUpload: 'Upload supporting documents',
          notes: 'Additional notes (optional)',
          consent: 'I agree that my details and documents are used only to complete this service, and to be notified of anything missing.',
          reviewIntro: 'Make sure everything is correct before submitting. You can go back to any step to edit.',
          edit: 'Edit', notSet: 'Not set', docsUploaded: 'uploaded',
          successTitle: 'Your request was received', requestNo: 'Request number',
          successBody: 'Khalsni will review your request and update its status. Follow it from the request page.',
          viewRequest: 'View request details', toDashboard: 'Back to my dashboard', newRequest: 'Another request',
          required: 'Required', optional: 'Optional',
        }),
    [isArabic],
  )

  // --- draft restore ---------------------------------------------------------
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
          reset({ ...baseValues, ...parsedDraft, service: requestedServiceId || parsedDraft.service || '', consent: true })
          return
        }
      } catch {
        localStorage.removeItem(draftStorageKey)
      }
    }
    reset(baseValues)
  }, [requestedServiceId, reset, toast, user])

  useEffect(() => {
    if (!requestedServiceId || !selectedService?.category?.slug) return
    const current = getValues()
    if (current.category_slug === selectedService.category.slug) return
    reset({ ...current, category_slug: selectedService.category.slug })
  }, [requestedServiceId, reset, selectedService, getValues])

  useEffect(() => {
    if (topRef.current) topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [step])

  // --- step field maps -----------------------------------------------------
  const docFieldNames = requiredDocuments.map((doc, i) => getDocumentFieldName(doc, i))
  const stepFieldNames = {
    0: startedFromService ? [] : ['category_slug', 'service'],
    1: ['full_name', 'phone', 'city', ...schemaFields.filter((f) => f.required).map((f) => f.inputName)],
    2: [...(requiredDocuments.length ? docFieldNames : ['documents']), 'consent'],
    3: [],
  }

  async function goNext() {
    const ok = await trigger(stepFieldNames[step] || [])
    if (!ok) return
    const next = Math.min(step + 1, 3)
    setStep(next)
    setMaxReached((m) => Math.max(m, next))
  }
  function goBack() {
    setStep((s) => Math.max(s - 1, 0))
  }

  function saveDraft() {
    const values = { ...getValues() }
    // File fields cannot be serialised — strip them from the draft.
    Object.keys(values).forEach((key) => {
      if (key === 'documents' || key.startsWith('document_') || (values[key] instanceof FileList)) {
        delete values[key]
      }
    })
    localStorage.setItem(draftStorageKey, serializeDraft(values))
    toast(T.savedDraft, 'info')
  }

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
        const file = values[getDocumentFieldName(document, index)]?.[0]
        if (file) {
          formData.append('document_types', getRequiredDocumentType(document, index))
          formData.append('documents', file)
        }
      })
    } else {
      Array.from(values.documents || []).forEach((file) => formData.append('documents', file))
    }

    try {
      const result = await api.createOrder(formData)
      setSubmittedOrder(result)
      setStep(4)
      ;(result.warnings || []).forEach((warning) => toast(warning, 'info'))
      localStorage.removeItem(draftStorageKey)
    } catch (submitError) {
      applyServerFieldErrors({
        error: submitError,
        setError,
        documents: requiredDocuments,
        fallbackField: 'root.server',
        fieldNameForDocumentIndex: (index, document) => getDocumentFieldName(document, index),
      })
      // jump to the earliest step that now has an error
      const v = getValues()
      if (['full_name', 'phone', 'city'].some((f) => errors[f]) || schemaFields.some((f) => errors[f.inputName])) setStep(1)
      else if (docFieldNames.some((f) => errors[f]) || errors.consent) setStep(2)
      toast(isArabic ? 'تعذّر إرسال الطلب. راجع الحقول المميزة.' : 'Could not submit. Check the highlighted fields.', 'error')
      void v
    }
  }

  // --- derived summary -----------------------------------------------------
  const values = watch()
  const duration = selectedService ? getServiceDuration(selectedServiceDetails || selectedService, language) : null
  const price = selectedService ? getServicePublicPrice(selectedServiceDetails || selectedService, language) : null
  const uploadedRequiredCount = requiredDocuments.filter((doc, i) => values[getDocumentFieldName(doc, i)]?.length).length
  const applicantDone = Boolean(values.full_name && values.phone && values.city)
  const checklist = [
    { label: T.steps[0], done: Boolean(selectedService) },
    { label: T.steps[1], done: Boolean(selectedService) && applicantDone },
    {
      label: T.steps[2],
      done:
        Boolean(selectedService) &&
        maxReached >= 2 &&
        (requiredDocuments.length ? uploadedRequiredCount === requiredDocuments.length && values.consent : Boolean(values.consent)),
    },
  ]

  const reviewRows = [
    { label: T.service, value: selectedService ? getServiceName(selectedService, language) : T.notSet, step: 0 },
    { label: T.fullName, value: values.full_name || T.notSet, step: 1 },
    { label: T.phone, value: values.phone || T.notSet, step: 1 },
    { label: T.nationalId, value: values.national_id || '—', step: 1 },
    { label: T.city, value: values.city || T.notSet, step: 1 },
    {
      label: T.reqDocs,
      value: requiredDocuments.length ? `${uploadedRequiredCount} / ${requiredDocuments.length} ${T.docsUploaded}` : (Array.from(values.documents || []).length + ' ' + T.docsUploaded),
      step: 2,
    },
    { label: T.price, value: price?.label || T.notSet, step: 0 },
    { label: T.duration, value: duration?.label || T.notSet, step: 0 },
  ]

  const NextIcon = isArabic ? ArrowLeft : ArrowRight
  const BackIcon = isArabic ? ArrowRight : ArrowLeft

  return (
    <div className="space-y-6" ref={topRef}>
      <header className="rounded-[var(--radius-xl)] border border-border bg-card p-5 shadow-soft sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-600">{T.eyebrow}</p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-black text-ink sm:text-3xl">
            <FilePlus2 className="me-2 inline h-6 w-6 text-brand-600" />
            {T.title}
          </h1>
          {step < 4 ? (
            <button className="btn-secondary" onClick={saveDraft} type="button">
              <Save className="h-4 w-4" />
              {T.saveDraft}
            </button>
          ) : null}
        </div>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-7 text-slate-600">{T.desc}</p>
      </header>

      {step < 4 ? (
        <ApplicationStepper
          currentIndex={step}
          onStepClick={(i) => i <= maxReached && setStep(i)}
          steps={T.steps.slice(0, 4)}
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <form className="space-y-6" id="client-create-order" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* STEP 0 — SERVICE */}
            {step === 0 ? (
              <StepPanel eyebrow={`${isArabic ? 'الخطوة' : 'Step'} 1`} title={T.steps[0]} description={isArabic ? 'اختر الخدمة التي تريد طلبها.' : 'Choose the service you want to request.'}>
                {startedFromService ? (
                  <div className="rounded-[var(--radius-lg)] border border-brand-100 bg-brand-50 p-5">
                    <input type="hidden" {...register('category_slug', { required: true })} />
                    <input type="hidden" {...register('service', { required: true })} />
                    <p className="text-xs font-bold text-brand-700">{T.lockedFromService}</p>
                    <h3 className="mt-2 text-lg font-black text-ink">{getServiceName(selectedService, language)}</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-600">
                      {selectedService.category?.full_path_name || selectedService.category?.name_ar || selectedService.category?.name_en}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    <Field error={errors.category_slug} label={T.category} required>
                      <select className="field" {...register('category_slug', { required: isArabic ? 'اختر التصنيف' : 'Select a category' })}>
                        <option value="">{T.pickCategory}</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.slug}>{category.full_path_name || category.name_ar || category.name_en}</option>
                        ))}
                      </select>
                    </Field>
                    <Field error={errors.service} label={T.service} required>
                      <select className="field" {...register('service', { required: isArabic ? 'اختر الخدمة' : 'Select a service' })}>
                        <option value="">{T.pickService}</option>
                        {filteredServices.map((service) => (
                          <option key={service.id} value={service.id}>{getServiceName(service, language)}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                )}
              </StepPanel>
            ) : null}

            {/* STEP 1 — APPLICANT */}
            {step === 1 ? (
              <StepPanel eyebrow={`${isArabic ? 'الخطوة' : 'Step'} 2`} title={T.steps[1]} description={isArabic ? 'بياناتك للتواصل ومتابعة الطلب.' : 'Your contact details for follow-up.'}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field error={errors.full_name} label={T.fullName} required>
                    <input className="field" {...register('full_name', { required: isArabic ? 'الاسم مطلوب' : 'Name is required' })} />
                  </Field>
                  <Field error={errors.phone} label={T.phone} required>
                    <input className="field" inputMode="tel" {...register('phone', { required: isArabic ? 'رقم الهاتف مطلوب' : 'Phone is required' })} />
                  </Field>
                  <Field error={errors.national_id} label={T.nationalId}>
                    <input className="field" {...register('national_id')} />
                  </Field>
                  <Field error={errors.city} label={T.city} required>
                    <input className="field" {...register('city', { required: isArabic ? 'المدينة مطلوبة' : 'City is required' })} />
                  </Field>
                </div>
                {schemaFields.length ? (
                  <div className="mt-6 rounded-[var(--radius-lg)] border border-border bg-brand-50/40 p-4">
                    <p className="mb-3 text-sm font-black text-ink">{T.extra}</p>
                    <DynamicServiceFields errors={errors} register={register} service={selectedServiceDetails} />
                  </div>
                ) : null}
              </StepPanel>
            ) : null}

            {/* STEP 2 — DOCUMENTS */}
            {step === 2 ? (
              <StepPanel eyebrow={`${isArabic ? 'الخطوة' : 'Step'} 3`} title={T.steps[2]} description={T.docsIntro}>
                <div className="space-y-4">
                  {requiredDocuments.length ? (
                    <div className="grid gap-4">
                      {requiredDocuments.map((document, index) => {
                        const fieldName = getDocumentFieldName(document, index)
                        const label = getRequiredDocumentLabel(document)
                        const optional = document?.is_required === false
                        return (
                          <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4" key={fieldName}>
                            <div className="mb-3 flex items-center justify-between gap-2">
                              <span className="text-sm font-black text-ink">{label}</span>
                              <span className={optional ? 'rounded-full bg-slate-100 px-2.5 py-0.5 text-[0.7rem] font-bold text-slate-600' : 'rounded-full bg-red-50 px-2.5 py-0.5 text-[0.7rem] font-bold text-red-700'}>
                                {optional ? T.optional : T.required}
                              </span>
                            </div>
                            {document?.instructions_ar || document?.instructions ? (
                              <p className="mb-3 text-xs font-semibold leading-6 text-slate-500">{isArabic ? document.instructions_ar || document.instructions : document.instructions || document.instructions_ar}</p>
                            ) : null}
                            <FileUploader
                              accept={buildAcceptValue(document)}
                              error={errors[fieldName]}
                              hint={buildUploadHint(document)}
                              registration={register(fieldName, {
                                validate: (fileList) =>
                                  validateSingleFileList(fileList, document, optional ? undefined : isArabic ? `الملف "${label}" مطلوب` : `"${label}" is required`),
                              })}
                            />
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <FileUploader
                      accept={buildAcceptValue()}
                      error={errors.documents}
                      hint={buildUploadHint()}
                      label={T.generalUpload}
                      multiple
                      registration={register('documents', { validate: (fileList) => validateMultipleFiles(fileList) })}
                    />
                  )}

                  <Field label={T.notes}>
                    <textarea className="field min-h-24" {...register('notes')} />
                  </Field>

                  <label className="flex items-start gap-3 rounded-[var(--radius-md)] border border-border bg-brand-50/40 p-4 text-sm font-semibold text-ink">
                    <input className="mt-1 h-4 w-4" type="checkbox" {...register('consent', { required: isArabic ? 'يجب الموافقة للمتابعة' : 'You must agree to continue' })} />
                    <span>{T.consent}</span>
                  </label>
                  {errors.consent ? <p className="text-xs font-bold text-danger" role="alert">{errors.consent.message}</p> : null}
                  {errors.root?.server ? <p className="text-sm font-bold text-danger" role="alert">{errors.root.server.message}</p> : null}
                </div>
              </StepPanel>
            ) : null}

            {/* STEP 3 — REVIEW */}
            {step === 3 ? (
              <StepPanel eyebrow={`${isArabic ? 'الخطوة' : 'Step'} 4`} title={T.steps[3]} description={T.reviewIntro}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {reviewRows.map((row) => (
                    <div className="flex items-start justify-between gap-3 rounded-[var(--radius-md)] border border-border bg-brand-50/40 p-4" key={row.label}>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-500">{row.label}</p>
                        <p className="mt-1 truncate text-sm font-black text-ink">{row.value}</p>
                      </div>
                      <button
                        className="kh-focusable shrink-0 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-bold text-brand-600 hover:bg-brand-50"
                        onClick={() => setStep(row.step)}
                        type="button"
                      >
                        {T.edit}
                      </button>
                    </div>
                  ))}
                </div>
                {errors.root?.server ? <p className="mt-4 text-sm font-bold text-danger" role="alert">{errors.root.server.message}</p> : null}
              </StepPanel>
            ) : null}

            {/* STEP 4 — SUCCESS */}
            {step === 4 && submittedOrder ? (
              <section className="rounded-[var(--radius-xl)] border-2 border-green-300 bg-green-50 p-6 text-center shadow-soft sm:p-10">
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-500 text-white">
                  <CheckCircle2 className="h-8 w-8" />
                </span>
                <h2 className="mt-4 text-2xl font-black text-green-900">{T.successTitle}</h2>
                <p className="mt-2 text-sm font-bold text-green-800">
                  {T.requestNo}: <span className="font-black">{submittedOrder.order_number}</span>
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-7 text-green-800">{T.successBody}</p>
                {submittedOrder.warnings?.length ? (
                  <div className="mx-auto mt-4 max-w-md space-y-1 rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                    {submittedOrder.warnings.map((w) => <p key={w}>{w}</p>)}
                  </div>
                ) : null}
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link className="btn-primary" to={`/customer/orders/${submittedOrder.id}`}>{T.viewRequest}</Link>
                  <Link className="btn-secondary" to="/customer/orders">{T.toDashboard}</Link>
                  <button
                    className="btn-ghost"
                    onClick={() => { setSubmittedOrder(null); setStep(0); setMaxReached(0); reset(buildBaseDraftValues({ requestedServiceId: '', user })) }}
                    type="button"
                  >
                    {T.newRequest}
                  </button>
                </div>
              </section>
            ) : null}

            {/* NAV */}
            {step < 4 ? (
              <div className="sticky bottom-2 z-10 flex items-center justify-between gap-3 rounded-[var(--radius-xl)] border border-border bg-card/95 p-3 shadow-soft backdrop-blur">
                <button className="btn-secondary" disabled={step === 0} onClick={goBack} type="button">
                  <BackIcon className="h-4 w-4" />
                  {T.back}
                </button>
                {step < 3 ? (
                  <button className="btn-primary" onClick={goNext} type="button">
                    {T.next}
                    <NextIcon className="h-4 w-4" />
                  </button>
                ) : (
                  <button className="btn-primary" disabled={isSubmitting} type="submit">
                    <CheckCircle2 className="h-4 w-4" />
                    {isSubmitting ? (isArabic ? 'جارٍ الإرسال...' : 'Submitting...') : T.submit}
                  </button>
                )}
              </div>
            ) : null}
          </form>
        </div>

        {/* SUMMARY ASIDE */}
        {step < 4 ? (
          <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
            <div className="rounded-[var(--radius-xl)] border border-border bg-card p-5 shadow-soft">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-600">{T.sSummary}</p>
              <h3 className="mt-2 text-lg font-black text-ink">
                {selectedService ? getServiceName(selectedService, language) : T.sPickFirst}
              </h3>
              {selectedService ? (
                <>
                  <p className="mt-2 line-clamp-3 text-sm font-semibold leading-6 text-slate-600">
                    {getServiceDescription(selectedServiceDetails || selectedService, language)}
                  </p>
                  <div className="mt-4 grid gap-2">
                    <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-brand-50/50 p-3 text-sm">
                      <WalletCards className="h-4 w-4 shrink-0 text-brand-600" />
                      <span className="font-bold text-slate-500">{T.price}:</span>
                      <span className="font-black text-ink">{price?.label || T.notSet}</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-brand-50/50 p-3 text-sm">
                      <Clock3 className="h-4 w-4 shrink-0 text-brand-600" />
                      <span className="font-bold text-slate-500">{T.duration}:</span>
                      <span className="font-black text-ink">{duration?.label || T.notSet}</span>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            <div className="rounded-[var(--radius-xl)] border border-border bg-card p-5 shadow-soft">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-600">{T.checklist}</p>
              <ul className="mt-3 space-y-2">
                {checklist.map((item, i) => (
                  <li className="flex items-center gap-2.5 text-sm font-bold" key={item.label}>
                    <span className={item.done ? 'grid h-6 w-6 place-items-center rounded-full bg-green-100 text-green-700' : 'grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-slate-400'}>
                      {item.done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                    </span>
                    <span className={item.done ? 'text-ink' : 'text-slate-500'}>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            {requiredDocuments.length ? (
              <div className="rounded-[var(--radius-xl)] border border-border bg-card p-5 shadow-soft">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-600">{T.reqDocs}</p>
                <ul className="mt-3 space-y-2">
                  {requiredDocuments.map((doc, i) => {
                    const uploaded = values[getDocumentFieldName(doc, i)]?.length
                    return (
                      <li className="flex items-center gap-2.5 text-sm font-bold" key={i}>
                        <span className={uploaded ? 'grid h-6 w-6 place-items-center rounded-full bg-green-100 text-green-700' : 'grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-slate-400'}>
                          {uploaded ? <CheckCircle2 className="h-4 w-4" /> : <FileText className="h-3.5 w-3.5" />}
                        </span>
                        <span className={uploaded ? 'text-ink' : 'text-slate-500'}>{getRequiredDocumentLabel(doc)}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>
    </div>
  )
}

export default CustomerCreateOrderPage
