import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import FileUploader from '../../components/FileUploader'
import DynamicServiceFields from '../../components/DynamicServiceFields'
import { api } from '../../api/services'
import { useAsyncData } from '../../hooks/useAsyncData'
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

function CreateOrderPage() {
  const [searchParams] = useSearchParams()
  const [submitted, setSubmitted] = useState(null)
  const serviceId = searchParams.get('service')
  const { data: services = [] } = useAsyncData(() => api.getServices(), [], [])
  const defaultService = useMemo(() => serviceId || services[0]?.id || '', [serviceId, services])
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    setError,
    clearErrors,
  } = useForm({
    defaultValues: {
      service: defaultService,
      consent: false,
    },
  })
  const selectedService = services.find((service) => String(service.id) === String(watch('service')))
  const { data: selectedServiceDetails } = useAsyncData(
    () => (selectedService?.slug ? api.getService(selectedService.slug) : Promise.resolve(null)),
    [selectedService?.slug],
    null,
  )
  const requiredDocuments = selectedServiceDetails?.required_documents || []
  const schemaFields = getServiceSchemaFields(selectedServiceDetails)

  useEffect(() => {
    if (defaultService) {
      setValue('service', String(defaultService))
    }
  }, [defaultService, setValue])

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
      setSubmitted(result)
      reset({ service: String(defaultService || ''), consent: false })
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

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
      <section className="glass-panel p-6">
        <p className="text-sm font-bold text-brand-700">طلب خدمة جديدة</p>
        <h1 className="mt-2 text-3xl font-extrabold text-ink">أدخل بياناتك وارفع الوثائق</h1>
        <form className="mt-8 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-ink">الخدمة المختارة</label>
            <select className="field" {...register('service', { required: 'الخدمة مطلوبة' })}>
              <option value="">اختر الخدمة</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name_ar}
                </option>
              ))}
            </select>
            {errors.service ? <p className="mt-2 text-sm text-danger">{errors.service.message}</p> : null}
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-ink">الاسم الكامل</label>
            <input className="field" {...register('full_name', { required: 'الاسم الكامل مطلوب' })} />
            {errors.full_name ? <p className="mt-2 text-sm text-danger">{errors.full_name.message}</p> : null}
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-ink">رقم الهاتف</label>
            <input className="field" {...register('phone', { required: 'رقم الهاتف مطلوب' })} />
            {errors.phone ? <p className="mt-2 text-sm text-danger">{errors.phone.message}</p> : null}
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-ink">الرقم الوطني</label>
            <input className="field" {...register('national_id')} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-ink">المدينة</label>
            <input className="field" {...register('city', { required: 'المدينة مطلوبة' })} />
            {errors.city ? <p className="mt-2 text-sm text-danger">{errors.city.message}</p> : null}
          </div>
          {schemaFields.length ? (
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-ink">البيانات الإضافية المطلوبة</label>
              <DynamicServiceFields errors={errors} register={register} service={selectedServiceDetails} />
            </div>
          ) : null}
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-ink">ملاحظات</label>
            <textarea className="field min-h-28" {...register('notes')} />
          </div>
          <div className="md:col-span-2">
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
                      label={label}
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
                label="رفع الوثائق"
                multiple
                name="documents"
                register={register}
                registration={register('documents', {
                  validate: (fileList) => validateMultipleFiles(fileList),
                })}
              />
            )}
            {errors.root?.server ? <p className="mt-2 text-sm text-danger">{errors.root.server.message}</p> : null}
          </div>
          <div className="md:col-span-2 flex items-start gap-3 rounded-2xl bg-brand-50 p-4 text-sm">
            <input className="mt-1" type="checkbox" {...register('consent', { required: 'يجب الموافقة على الشروط' })} />
            <div>
              <p>أوافق على استخدام بياناتي ووثائقي لأغراض تنفيذ الخدمة فقط.</p>
              {errors.consent ? <p className="mt-2 text-sm text-danger">{errors.consent.message}</p> : null}
            </div>
          </div>
          <div className="md:col-span-2">
            <button className="btn-primary w-full" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
            </button>
          </div>
        </form>
      </section>
      <aside className="glass-panel p-6">
        <h2 className="text-xl font-bold text-ink">بعد الإرسال</h2>
        <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
          <li>سيتم إنشاء رقم طلب فوري لمتابعة حالته.</li>
          <li>سيقوم فريق العمليات بمراجعة الوثائق أولاً.</li>
          <li>إذا كانت هناك وثائق ناقصة سيصلك طلب استكمال.</li>
          <li>عند الإنجاز ستتمكن من تنزيل النتيجة النهائية.</li>
        </ul>
        {submitted ? (
          <div className="mt-6 rounded-2xl bg-green-50 p-5 text-green-800">
            <p className="font-bold">تم استلام طلبك بنجاح</p>
            <p className="mt-2 text-sm">رقم الطلب: {submitted.order_number}</p>
          </div>
        ) : null}
      </aside>
    </div>
  )
}

export default CreateOrderPage
