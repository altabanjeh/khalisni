import { Database, FolderKanban, Settings, UsersRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import DataTable from '../../components/DataTable'
import PageHeader from '../../components/PageHeader'
import { api } from '../../api/services'
import { useAsyncData } from '../../hooks/useAsyncData'

const defaultSettingValues = {
  key: '',
  description: '',
  valueText: '{\n  \n}',
}

const defaultCategoryValues = {
  name_ar: '',
  name_en: '',
  slug: '',
  description_ar: '',
  description_en: '',
  icon: '',
  display_order: 0,
  is_active: true,
}

const defaultServiceValues = {
  category: '',
  name_ar: '',
  name_en: '',
  slug: '',
  short_description_ar: '',
  short_description_en: '',
  description_ar: '',
  description_en: '',
  required_information_schema_text: '[]',
  terms_ar: '',
  terms_en: '',
  base_price: '0.00',
  government_fee: '0.00',
  service_fee: '0.00',
  estimated_duration: 1,
  estimated_duration_unit: 'days',
  price_type: 'fixed',
  is_online: true,
  provider_required: true,
  requires_manual_review: true,
  requires_appointment: false,
  is_featured: false,
  is_active: true,
  display_order: 0,
}

const defaultUserValues = {
  full_name: '',
  email: '',
  phone: '',
  password: '',
  role: 'customer',
  national_id: '',
  is_active: true,
  is_staff: false,
  is_verified: false,
}

function getErrorMessage(error) {
  const detail = error?.response?.data
  if (typeof detail === 'string') return detail
  if (detail?.detail) return detail.detail
  if (detail && typeof detail === 'object') {
    return Object.entries(detail)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
      .join(' | ')
  }
  return 'تعذر إتمام العملية.'
}

function formatJsonValue(value) {
  return JSON.stringify(value ?? {}, null, 2)
}

function CheckboxField({ label, registration }) {
  return (
    <label className="flex items-center justify-between rounded-2xl border border-border bg-brand-50/40 px-4 py-3 text-sm font-medium text-ink">
      <span>{label}</span>
      <input className="h-4 w-4 accent-brand-600" type="checkbox" {...registration} />
    </label>
  )
}

function SectionFeedback({ message }) {
  if (!message) return null

  return (
    <p className={`text-sm ${message.type === 'error' ? 'text-danger' : 'text-success'}`}>
      {message.text}
    </p>
  )
}

function AdminCmsPage() {
  const {
    data: settings = [],
    loading: settingsLoading,
    reload: reloadSettings,
  } = useAsyncData(() => api.getSystemSettings(), [], [])
  const {
    data: categories = [],
    loading: categoriesLoading,
    reload: reloadCategories,
  } = useAsyncData(() => api.getAdminCategories(), [], [])
  const {
    data: services = [],
    loading: servicesLoading,
    reload: reloadServices,
  } = useAsyncData(() => api.getAdminServices(), [], [])
  const {
    data: users = [],
    loading: usersLoading,
    reload: reloadUsers,
  } = useAsyncData(() => api.getAdminUsers(), [], [])

  const [selectedSettingId, setSelectedSettingId] = useState(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)
  const [selectedServiceId, setSelectedServiceId] = useState(null)
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [feedback, setFeedback] = useState({})

  const settingForm = useForm({ defaultValues: defaultSettingValues })
  const categoryForm = useForm({ defaultValues: defaultCategoryValues })
  const serviceForm = useForm({ defaultValues: defaultServiceValues })
  const userForm = useForm({ defaultValues: defaultUserValues })

  const selectedSetting = useMemo(
    () => settings.find((item) => String(item.id) === String(selectedSettingId)) || null,
    [settings, selectedSettingId],
  )
  const selectedCategory = useMemo(
    () => categories.find((item) => String(item.id) === String(selectedCategoryId)) || null,
    [categories, selectedCategoryId],
  )
  const selectedService = useMemo(
    () => services.find((item) => String(item.id) === String(selectedServiceId)) || null,
    [services, selectedServiceId],
  )
  const selectedUser = useMemo(
    () => users.find((item) => String(item.id) === String(selectedUserId)) || null,
    [users, selectedUserId],
  )

  useEffect(() => {
    settingForm.reset(
      selectedSetting
        ? {
            key: selectedSetting.key || '',
            description: selectedSetting.description || '',
            valueText: formatJsonValue(selectedSetting.value),
          }
        : defaultSettingValues,
    )
  }, [selectedSetting, settingForm])

  useEffect(() => {
    categoryForm.reset(
      selectedCategory
        ? {
            name_ar: selectedCategory.name_ar || '',
            name_en: selectedCategory.name_en || '',
            slug: selectedCategory.slug || '',
            description_ar: selectedCategory.description_ar || '',
            description_en: selectedCategory.description_en || '',
            icon: selectedCategory.icon || '',
            display_order: selectedCategory.display_order ?? 0,
            is_active: Boolean(selectedCategory.is_active),
          }
        : defaultCategoryValues,
    )
  }, [selectedCategory, categoryForm])

  useEffect(() => {
    serviceForm.reset(
      selectedService
        ? {
            category: selectedService.category?.id || selectedService.category || '',
            name_ar: selectedService.name_ar || '',
            name_en: selectedService.name_en || '',
            slug: selectedService.slug || '',
            short_description_ar: selectedService.short_description_ar || '',
            short_description_en: selectedService.short_description_en || '',
            description_ar: selectedService.description_ar || '',
            description_en: selectedService.description_en || '',
            required_information_schema_text: formatJsonValue(selectedService.required_information_schema || []),
            terms_ar: selectedService.terms_ar || '',
            terms_en: selectedService.terms_en || '',
            base_price: selectedService.base_price ?? '0.00',
            government_fee: selectedService.government_fee ?? '0.00',
            service_fee: selectedService.service_fee ?? '0.00',
            estimated_duration: selectedService.estimated_duration ?? 1,
            estimated_duration_unit: selectedService.estimated_duration_unit || 'days',
            price_type: selectedService.price_type || 'fixed',
            is_online: Boolean(selectedService.is_online),
            provider_required: Boolean(selectedService.provider_required),
            requires_manual_review: Boolean(selectedService.requires_manual_review),
            requires_appointment: Boolean(selectedService.requires_appointment),
            is_featured: Boolean(selectedService.is_featured),
            is_active: Boolean(selectedService.is_active),
            display_order: selectedService.display_order ?? 0,
          }
        : defaultServiceValues,
    )
  }, [selectedService, serviceForm])

  useEffect(() => {
    userForm.reset(
      selectedUser
        ? {
            full_name: selectedUser.full_name || '',
            email: selectedUser.email || '',
            phone: selectedUser.phone || '',
            password: '',
            role: selectedUser.role || 'customer',
            national_id: selectedUser.national_id || '',
            is_active: Boolean(selectedUser.is_active),
            is_staff: Boolean(selectedUser.is_staff),
            is_verified: Boolean(selectedUser.is_verified),
          }
        : defaultUserValues,
    )
  }, [selectedUser, userForm])

  function updateFeedback(section, type, text) {
    setFeedback((current) => ({
      ...current,
      [section]: { type, text },
    }))
  }

  async function handleSettingSubmit(values) {
    try {
      const payload = {
        key: values.key.trim(),
        description: values.description.trim(),
        value: JSON.parse(values.valueText),
      }
      if (selectedSettingId) {
        await api.updateSystemSetting(selectedSettingId, payload)
        updateFeedback('settings', 'success', 'تم تحديث إعداد النظام.')
      } else {
        await api.createSystemSetting(payload)
        updateFeedback('settings', 'success', 'تم إنشاء إعداد جديد.')
      }
      reloadSettings()
      setSelectedSettingId(null)
      settingForm.reset(defaultSettingValues)
    } catch (error) {
      updateFeedback('settings', 'error', getErrorMessage(error))
    }
  }

  async function handleDeleteSetting(id) {
    if (!window.confirm('سيتم حذف هذا الإعداد. هل تريد المتابعة؟')) return
    try {
      await api.deleteSystemSetting(id)
      if (String(selectedSettingId) === String(id)) {
        setSelectedSettingId(null)
        settingForm.reset(defaultSettingValues)
      }
      reloadSettings()
      updateFeedback('settings', 'success', 'تم حذف الإعداد.')
    } catch (error) {
      updateFeedback('settings', 'error', getErrorMessage(error))
    }
  }

  async function handleCategorySubmit(values) {
    try {
      const payload = {
        ...values,
        display_order: Number(values.display_order || 0),
      }
      if (selectedCategoryId) {
        await api.updateAdminCategory(selectedCategoryId, payload)
        updateFeedback('categories', 'success', 'تم تحديث التصنيف.')
      } else {
        await api.createAdminCategory(payload)
        updateFeedback('categories', 'success', 'تم إنشاء التصنيف.')
      }
      reloadCategories()
      reloadServices()
      setSelectedCategoryId(null)
      categoryForm.reset(defaultCategoryValues)
    } catch (error) {
      updateFeedback('categories', 'error', getErrorMessage(error))
    }
  }

  async function handleDeleteCategory(id) {
    if (!window.confirm('سيتم حذف التصنيف إذا لم يكن مستخدماً. هل تريد المتابعة؟')) return
    try {
      await api.deleteAdminCategory(id)
      if (String(selectedCategoryId) === String(id)) {
        setSelectedCategoryId(null)
        categoryForm.reset(defaultCategoryValues)
      }
      reloadCategories()
      reloadServices()
      updateFeedback('categories', 'success', 'تم حذف التصنيف.')
    } catch (error) {
      updateFeedback('categories', 'error', getErrorMessage(error))
    }
  }

  async function handleServiceSubmit(values) {
    try {
      let requiredInformationSchema = []
      try {
        requiredInformationSchema = JSON.parse(values.required_information_schema_text || '[]')
      } catch {
        serviceForm.setError('required_information_schema_text', {
          type: 'manual',
          message: 'صيغة JSON غير صالحة.',
        })
        return
      }

      if (!Array.isArray(requiredInformationSchema)) {
        serviceForm.setError('required_information_schema_text', {
          type: 'manual',
          message: 'يجب أن تكون بنية البيانات مصفوفة JSON.',
        })
        return
      }

      const payload = {
        ...values,
        category: Number(values.category),
        required_information_schema: requiredInformationSchema,
        estimated_duration: Number(values.estimated_duration || 1),
        display_order: Number(values.display_order || 0),
      }
      delete payload.required_information_schema_text
      if (selectedServiceId) {
        await api.updateAdminService(selectedServiceId, payload)
        updateFeedback('services', 'success', 'تم تحديث الخدمة.')
      } else {
        await api.createAdminService(payload)
        updateFeedback('services', 'success', 'تم إنشاء الخدمة.')
      }
      reloadServices()
      setSelectedServiceId(null)
      serviceForm.reset(defaultServiceValues)
    } catch (error) {
      updateFeedback('services', 'error', getErrorMessage(error))
    }
  }

  async function handleDeleteService(id) {
    if (!window.confirm('سيتم حذف الخدمة إذا لم تكن مرتبطة بطلبات. هل تريد المتابعة؟')) return
    try {
      await api.deleteAdminService(id)
      if (String(selectedServiceId) === String(id)) {
        setSelectedServiceId(null)
        serviceForm.reset(defaultServiceValues)
      }
      reloadServices()
      updateFeedback('services', 'success', 'تم حذف الخدمة.')
    } catch (error) {
      updateFeedback('services', 'error', getErrorMessage(error))
    }
  }

  async function handleUserSubmit(values) {
    try {
      const payload = {
        ...values,
      }
      if (!payload.password) {
        delete payload.password
      }

      if (selectedUserId) {
        await api.updateAdminUser(selectedUserId, payload)
        updateFeedback('users', 'success', 'تم تحديث المستخدم.')
      } else {
        await api.createAdminUser(payload)
        updateFeedback('users', 'success', 'تم إنشاء المستخدم.')
      }
      reloadUsers()
      setSelectedUserId(null)
      userForm.reset(defaultUserValues)
    } catch (error) {
      updateFeedback('users', 'error', getErrorMessage(error))
    }
  }

  async function handleDeleteUser(id) {
    if (!window.confirm('سيتم حذف المستخدم نهائياً. هل تريد المتابعة؟')) return
    try {
      await api.deleteAdminUser(id)
      if (String(selectedUserId) === String(id)) {
        setSelectedUserId(null)
        userForm.reset(defaultUserValues)
      }
      reloadUsers()
      updateFeedback('users', 'success', 'تم حذف المستخدم.')
    } catch (error) {
      updateFeedback('users', 'error', getErrorMessage(error))
    }
  }

  if (settingsLoading || categoriesLoading || servicesLoading || usersLoading) {
    return <div className="glass-panel p-6 text-sm text-slate-500">جاري تحميل شاشة إدارة المحتوى...</div>
  }

  const settingColumns = [
    { key: 'key', label: 'المفتاح' },
    { key: 'description', label: 'الوصف' },
    {
      key: 'updated_at',
      label: 'آخر تحديث',
      render: (row) => row.updated_at || 'غير محدد',
    },
    {
      key: 'actions',
      label: 'الإجراءات',
      render: (row) => (
        <div className="flex gap-2">
          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => setSelectedSettingId(row.id)} type="button">
            تعديل
          </button>
          <button className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger" onClick={() => handleDeleteSetting(row.id)} type="button">
            حذف
          </button>
        </div>
      ),
    },
  ]

  const categoryColumns = [
    { key: 'name_ar', label: 'الاسم العربي' },
    { key: 'slug', label: 'المعرف' },
    { key: 'display_order', label: 'الترتيب' },
    { key: 'is_active', label: 'الحالة', render: (row) => (row.is_active ? 'نشط' : 'مخفي') },
    {
      key: 'actions',
      label: 'الإجراءات',
      render: (row) => (
        <div className="flex gap-2">
          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => setSelectedCategoryId(row.id)} type="button">
            تعديل
          </button>
          <button className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger" onClick={() => handleDeleteCategory(row.id)} type="button">
            حذف
          </button>
        </div>
      ),
    },
  ]

  const serviceColumns = [
    { key: 'name_ar', label: 'الخدمة' },
    { key: 'category', label: 'التصنيف', render: (row) => row.category?.name_ar || row.category_name || 'غير محدد' },
    { key: 'service_fee', label: 'رسوم الخدمة' },
    { key: 'government_fee', label: 'الرسوم الحكومية' },
    { key: 'is_active', label: 'الحالة', render: (row) => (row.is_active ? 'نشطة' : 'مخفية') },
    {
      key: 'actions',
      label: 'الإجراءات',
      render: (row) => (
        <div className="flex gap-2">
          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => setSelectedServiceId(row.id)} type="button">
            تعديل
          </button>
          <button className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger" onClick={() => handleDeleteService(row.id)} type="button">
            حذف
          </button>
        </div>
      ),
    },
  ]

  const userColumns = [
    { key: 'full_name', label: 'الاسم' },
    { key: 'email', label: 'البريد' },
    { key: 'role', label: 'الدور' },
    { key: 'is_active', label: 'الحالة', render: (row) => (row.is_active ? 'نشط' : 'موقوف') },
    {
      key: 'actions',
      label: 'الإجراءات',
      render: (row) => (
        <div className="flex gap-2">
          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => setSelectedUserId(row.id)} type="button">
            تعديل
          </button>
          <button className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger" onClick={() => handleDeleteUser(row.id)} type="button">
            حذف
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="page-section space-y-6">
      <PageHeader
        description="شاشة موحدة لإدارة إعدادات الموقع، التصنيفات، الخدمات، وحسابات المستخدمين من لوحة الإدارة."
        eyebrow="CMS"
        icon={Settings}
        title="إدارة المحتوى والنظام"
      />

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="icon-chip">
              <Database className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-ink">إعدادات النظام</h2>
              <p className="text-sm text-slate-600">مفاتيح JSON مرنة لتغيير محتوى الموقع وسلوك النظام.</p>
            </div>
          </div>
          <DataTable
            columns={settingColumns}
            emptyDescription="أضف إعدادات الموقع العامة مثل الصفحة الرئيسية وبيانات التواصل."
            emptyTitle="لا توجد إعدادات"
            rows={settings}
          />
        </div>

        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold text-ink">{selectedSetting ? 'تعديل الإعداد' : 'إعداد جديد'}</h2>
          <form className="mt-6 space-y-4" onSubmit={settingForm.handleSubmit(handleSettingSubmit)}>
            <input className="field" placeholder="key" {...settingForm.register('key', { required: true })} />
            <input className="field" placeholder="الوصف" {...settingForm.register('description')} />
            <textarea className="field min-h-48 font-mono text-left" dir="ltr" {...settingForm.register('valueText', { required: true })} />
            <div className="flex gap-3">
              <button className="btn-primary flex-1">{selectedSetting ? 'حفظ التعديل' : 'إضافة الإعداد'}</button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setSelectedSettingId(null)
                  settingForm.reset(defaultSettingValues)
                }}
                type="button"
              >
                جديد
              </button>
            </div>
            <SectionFeedback message={feedback.settings} />
          </form>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="icon-chip">
              <FolderKanban className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-ink">التصنيفات</h2>
              <p className="text-sm text-slate-600">تنظيم مجموعات الخدمات وإظهارها على الواجهة العامة.</p>
            </div>
          </div>
          <DataTable
            columns={categoryColumns}
            emptyDescription="أنشئ أول تصنيف لبدء تنظيم الخدمات."
            emptyTitle="لا توجد تصنيفات"
            rows={categories}
          />
        </div>

        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold text-ink">{selectedCategory ? 'تعديل التصنيف' : 'تصنيف جديد'}</h2>
          <form className="mt-6 space-y-4" onSubmit={categoryForm.handleSubmit(handleCategorySubmit)}>
            <input className="field" placeholder="الاسم بالعربية" {...categoryForm.register('name_ar', { required: true })} />
            <input className="field" placeholder="الاسم بالإنجليزية" {...categoryForm.register('name_en', { required: true })} />
            <input className="field" placeholder="slug" {...categoryForm.register('slug', { required: true })} />
            <input className="field" placeholder="الأيقونة" {...categoryForm.register('icon')} />
            <input className="field" placeholder="الترتيب" type="number" {...categoryForm.register('display_order')} />
            <textarea className="field min-h-24" placeholder="الوصف بالعربية" {...categoryForm.register('description_ar')} />
            <textarea className="field min-h-24" placeholder="الوصف بالإنجليزية" {...categoryForm.register('description_en')} />
            <CheckboxField label="التصنيف نشط" registration={categoryForm.register('is_active')} />
            <div className="flex gap-3">
              <button className="btn-primary flex-1">{selectedCategory ? 'حفظ التعديل' : 'إضافة التصنيف'}</button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setSelectedCategoryId(null)
                  categoryForm.reset(defaultCategoryValues)
                }}
                type="button"
              >
                جديد
              </button>
            </div>
            <SectionFeedback message={feedback.categories} />
          </form>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="icon-chip">
              <Settings className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-ink">الخدمات</h2>
              <p className="text-sm text-slate-600">تعديل الأسعار، مدة التنفيذ، وإتاحة الخدمة للطلب المباشر.</p>
            </div>
          </div>
          <DataTable
            columns={serviceColumns}
            emptyDescription="أضف خدمة جديدة لتظهر في الموقع ولوحات المتابعة."
            emptyTitle="لا توجد خدمات"
            rows={services}
          />
        </div>

        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold text-ink">{selectedService ? 'تعديل الخدمة' : 'خدمة جديدة'}</h2>
          <form className="mt-6 space-y-4" onSubmit={serviceForm.handleSubmit(handleServiceSubmit)}>
            <select className="field" {...serviceForm.register('category', { required: true })}>
              <option value="">اختر التصنيف</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name_ar}
                </option>
              ))}
            </select>
            <input className="field" placeholder="الاسم بالعربية" {...serviceForm.register('name_ar', { required: true })} />
            <input className="field" placeholder="الاسم بالإنجليزية" {...serviceForm.register('name_en', { required: true })} />
            <input className="field" placeholder="slug" {...serviceForm.register('slug', { required: true })} />
            <input className="field" placeholder="وصف قصير بالعربية" {...serviceForm.register('short_description_ar')} />
            <input className="field" placeholder="وصف قصير بالإنجليزية" {...serviceForm.register('short_description_en')} />
            <textarea className="field min-h-24" placeholder="الوصف بالعربية" {...serviceForm.register('description_ar', { required: true })} />
            <textarea className="field min-h-24" placeholder="الوصف بالإنجليزية" {...serviceForm.register('description_en')} />
            <textarea
              className="field min-h-24 font-mono text-left"
              dir="ltr"
              placeholder='[{"name":"passport_number","label_ar":"رقم الجواز","type":"text","required":true}]'
              {...serviceForm.register('required_information_schema_text')}
            />
            {serviceForm.formState.errors.required_information_schema_text ? (
              <p className="text-sm text-danger">{serviceForm.formState.errors.required_information_schema_text.message}</p>
            ) : null}
            <textarea className="field min-h-24" placeholder="الشروط بالعربية" {...serviceForm.register('terms_ar')} />
            <textarea className="field min-h-24" placeholder="Terms in English" {...serviceForm.register('terms_en')} />
            <div className="grid gap-4 md:grid-cols-3">
              <input className="field" placeholder="Base price" step="0.01" type="number" {...serviceForm.register('base_price', { min: 0 })} />
              <input className="field" placeholder="Government fee" step="0.01" type="number" {...serviceForm.register('government_fee', { min: 0 })} />
              <input className="field" placeholder="Service fee" step="0.01" type="number" {...serviceForm.register('service_fee', { min: 0 })} />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <input className="field" placeholder="مدة التنفيذ" type="number" {...serviceForm.register('estimated_duration', { min: 1 })} />
              <select className="field" {...serviceForm.register('estimated_duration_unit')}>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
              </select>
              <select className="field" {...serviceForm.register('price_type')}>
                <option value="fixed">Fixed</option>
                <option value="starts_from">Starts from</option>
                <option value="quotation">Quotation</option>
                <option value="free">Free</option>
              </select>
            </div>
            <input className="field" placeholder="ترتيب العرض" type="number" {...serviceForm.register('display_order')} />
            <div className="grid gap-3 md:grid-cols-2">
              <CheckboxField label="الخدمة متاحة أونلاين" registration={serviceForm.register('is_online')} />
              <CheckboxField label="تحتاج مزود خدمة" registration={serviceForm.register('provider_required')} />
              <CheckboxField label="تحتاج مراجعة يدوية" registration={serviceForm.register('requires_manual_review')} />
              <CheckboxField label="تحتاج موعد" registration={serviceForm.register('requires_appointment')} />
              <CheckboxField label="إبراز في الصفحة الرئيسية" registration={serviceForm.register('is_featured')} />
              <CheckboxField label="الخدمة نشطة" registration={serviceForm.register('is_active')} />
            </div>
            <div className="flex gap-3">
              <button className="btn-primary flex-1">{selectedService ? 'حفظ التعديل' : 'إضافة الخدمة'}</button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setSelectedServiceId(null)
                  serviceForm.reset(defaultServiceValues)
                }}
                type="button"
              >
                جديد
              </button>
            </div>
            <SectionFeedback message={feedback.services} />
          </form>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="icon-chip">
              <UsersRound className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-ink">المستخدمون</h2>
              <p className="text-sm text-slate-600">إنشاء الحسابات وتعديل الأدوار والصلاحيات التشغيلية.</p>
            </div>
          </div>
          <DataTable
            columns={userColumns}
            emptyDescription="أضف أول مستخدم إداري أو تشغيلي."
            emptyTitle="لا يوجد مستخدمون"
            rows={users}
          />
        </div>

        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold text-ink">{selectedUser ? 'تعديل المستخدم' : 'مستخدم جديد'}</h2>
          <form className="mt-6 space-y-4" onSubmit={userForm.handleSubmit(handleUserSubmit)}>
            <input className="field" placeholder="الاسم الكامل" {...userForm.register('full_name', { required: true })} />
            <input className="field" placeholder="البريد الإلكتروني" type="email" {...userForm.register('email', { required: true })} />
            <input className="field" placeholder="الهاتف" {...userForm.register('phone')} />
            <input className="field" placeholder={selectedUser ? 'كلمة مرور جديدة إن لزم' : 'كلمة المرور'} type="password" {...userForm.register('password')} />
            <select className="field" {...userForm.register('role')}>
              <option value="admin">Admin</option>
              <option value="employee">Employee</option>
              <option value="support">Support</option>
              <option value="provider">Provider</option>
              <option value="customer">Customer</option>
            </select>
            <input className="field" placeholder="الرقم الوطني" {...userForm.register('national_id')} />
            <div className="grid gap-3 md:grid-cols-3">
              <CheckboxField label="نشط" registration={userForm.register('is_active')} />
              <CheckboxField label="له دخول Django Admin" registration={userForm.register('is_staff')} />
              <CheckboxField label="موثق" registration={userForm.register('is_verified')} />
            </div>
            <div className="flex gap-3">
              <button className="btn-primary flex-1">{selectedUser ? 'حفظ التعديل' : 'إضافة المستخدم'}</button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setSelectedUserId(null)
                  userForm.reset(defaultUserValues)
                }}
                type="button"
              >
                جديد
              </button>
            </div>
            <SectionFeedback message={feedback.users} />
          </form>
        </div>
      </section>
    </div>
  )
}

export default AdminCmsPage
