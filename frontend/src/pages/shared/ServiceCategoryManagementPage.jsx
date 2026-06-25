import { ArrowDown, ArrowUp, FolderTree } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import ConfirmModal from '../../components/ConfirmModal'
import DataTable from '../../components/DataTable'
import FormModal from '../../components/FormModal'
import PageHeader from '../../components/PageHeader'
import { getDisplayError } from '../../api/client'
import { api } from '../../api/services'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { hasPermission } from '../../utils/authz'
import { generateCatalogSlug, suggestCategoryIcon } from '../../utils/catalogDefaults'

const defaultValues = {
  name_ar: '',
  name_en: '',
  slug: '',
  parent_id: '',
  description_ar: '',
  description_en: '',
  icon: '',
  color: '',
  sort_order: 0,
  is_active: true,
  show_on_public_site: true,
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

function CheckboxField({ label, registration }) {
  return (
    <label className="flex items-center justify-between rounded-2xl border border-border bg-brand-50/40 px-4 py-3 text-sm font-medium text-ink">
      <span>{label}</span>
      <input className="h-4 w-4 accent-brand-600" type="checkbox" {...registration} />
    </label>
  )
}

function ServiceCategoryManagementPage() {
  const { user } = useAuth()
  const { isArabic } = useLanguage()
  const { toast } = useToast()
  const form = useForm({ defaultValues })
  const [filters, setFilters] = useState({
    is_active: '',
    show_on_public_site: '',
    parent: '',
  })
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [pendingDeactivate, setPendingDeactivate] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const canManage =
    user?.role === 'admin' || hasPermission(user, 'services.manage_service_prices')

  const { data: categories = [], loading, reload } = useAsyncData(
    () => api.getAdminCategories(filters),
    [filters.is_active, filters.show_on_public_site, filters.parent],
    [],
  )

  const selectedCategory = useMemo(
    () => categories.find((item) => String(item.id) === String(selectedCategoryId)) || null,
    [categories, selectedCategoryId],
  )
  const categoryNameAr = form.watch('name_ar')
  const categoryNameEn = form.watch('name_en')
  const generatedSlug = selectedCategory?.slug || form.watch('slug') || generateCatalogSlug([categoryNameEn, categoryNameAr], 'category')
  const generatedIcon = selectedCategory?.icon || form.watch('icon') || suggestCategoryIcon(categoryNameEn, categoryNameAr)
  const parentOptions = useMemo(
    () => categories.filter((item) => String(item.id) !== String(selectedCategoryId)),
    [categories, selectedCategoryId],
  )

  useEffect(() => {
    form.reset(
      selectedCategory
        ? {
            name_ar: selectedCategory.name_ar || '',
            name_en: selectedCategory.name_en || '',
            slug: selectedCategory.slug || '',
            parent_id: selectedCategory.parent_id || selectedCategory.parent?.id || '',
            description_ar: selectedCategory.description_ar || '',
            description_en: selectedCategory.description_en || '',
            icon: selectedCategory.icon || '',
            color: selectedCategory.color || '',
            sort_order: selectedCategory.sort_order ?? selectedCategory.display_order ?? 0,
            is_active: Boolean(selectedCategory.is_active),
            show_on_public_site: Boolean(selectedCategory.show_on_public_site),
          }
        : defaultValues,
    )
  }, [form, selectedCategory])

  useEffect(() => {
    if (selectedCategory) return
    form.setValue('slug', generateCatalogSlug([categoryNameEn, categoryNameAr], 'category'), { shouldDirty: false })
  }, [categoryNameAr, categoryNameEn, form, selectedCategory])

  useEffect(() => {
    if (selectedCategory) return
    form.setValue('icon', suggestCategoryIcon(categoryNameEn, categoryNameAr), { shouldDirty: false })
  }, [categoryNameAr, categoryNameEn, form, selectedCategory])

  function openCreateForm() {
    setSelectedCategoryId(null)
    form.reset(defaultValues)
    setIsFormOpen(true)
  }

  function openEditForm(id) {
    setSelectedCategoryId(id)
    setIsFormOpen(true)
  }

  function closeForm() {
    setSelectedCategoryId(null)
    form.reset(defaultValues)
    setIsFormOpen(false)
  }

  async function handleSubmit(values) {
    setSubmitting(true)
    try {
      const payload = {
        name_ar: values.name_ar.trim(),
        name_en: values.name_en.trim(),
        slug: (values.slug || generatedSlug || '').trim(),
        parent_id: values.parent_id ? Number(values.parent_id) : null,
        description_ar: values.description_ar.trim(),
        description_en: values.description_en.trim(),
        icon: (values.icon || generatedIcon || '').trim(),
        color: values.color.trim(),
        sort_order: Number(values.sort_order || 0),
        is_active: Boolean(values.is_active),
        show_on_public_site: Boolean(values.show_on_public_site),
      }

      if (selectedCategory) {
        await api.updateAdminCategory(selectedCategory.id, payload)
        toast(isArabic ? 'تم تحديث التصنيف.' : 'Service category updated.', 'success')
      } else {
        await api.createAdminCategory(payload)
        toast(isArabic ? 'تم إنشاء التصنيف.' : 'Service category created.', 'success')
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
    const categoryId = pendingDeactivate.id
    setPendingDeactivate(null)

    try {
      await api.deleteAdminCategory(categoryId)
      toast(isArabic ? 'تم إيقاف التصنيف.' : 'Service category deactivated.', 'success')
      reload()
    } catch (error) {
      toast(getDisplayError(error), 'error')
    }
  }

  async function handleMove(category, direction) {
    const ordered = [...categories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    const currentIndex = ordered.findIndex((item) => item.id === category.id)
    const swapIndex = currentIndex + direction
    if (currentIndex < 0 || swapIndex < 0 || swapIndex >= ordered.length) return

    const current = ordered[currentIndex]
    const target = ordered[swapIndex]

    try {
      await api.reorderAdminCategories([
        { id: current.id, sort_order: target.sort_order ?? swapIndex },
        { id: target.id, sort_order: current.sort_order ?? currentIndex },
      ])
      reload()
    } catch (error) {
      toast(getDisplayError(error), 'error')
    }
  }

  const columns = [
    { key: 'name_ar', label: isArabic ? 'التصنيف' : 'Category' },
    {
      key: 'parent_name',
      label: isArabic ? 'التصنيف الأصلي' : 'Parent',
      render: (row) => row.parent_name || (isArabic ? 'رئيسي' : 'Root'),
    },
    { key: 'sort_order', label: isArabic ? 'الترتيب' : 'Order' },
    {
      key: 'show_on_public_site',
      label: isArabic ? 'الظهور' : 'Public',
      render: (row) => (row.show_on_public_site ? (isArabic ? 'ظاهر' : 'Visible') : (isArabic ? 'داخلي' : 'Internal')),
    },
    {
      key: 'is_active',
      label: isArabic ? 'الحالة' : 'Status',
      render: (row) => (row.is_active ? (isArabic ? 'مفعّل' : 'Active') : (isArabic ? 'موقف' : 'Inactive')),
    },
    { key: 'active_services_count', label: isArabic ? 'الخدمات' : 'Services' },
    {
      key: 'services_preview',
      label: isArabic ? 'معاينة الخدمات' : 'Service Preview',
      render: (row) =>
        row.services_preview?.length
          ? row.services_preview.map((service) => service.name_ar).join(', ')
          : (isArabic ? 'لا توجد خدمات فعّالة' : 'No active services'),
    },
    {
      key: 'actions',
      label: isArabic ? 'الإجراءات' : 'Actions',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          {canManage ? (
            <>
              <button className="btn-secondary px-3 py-2 text-xs" onClick={() => openEditForm(row.id)} type="button">
                {isArabic ? 'تعديل' : 'Edit'}
              </button>
              <button className="btn-secondary px-3 py-2 text-xs" onClick={() => handleMove(row, -1)} type="button">
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button className="btn-secondary px-3 py-2 text-xs" onClick={() => handleMove(row, 1)} type="button">
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger"
                onClick={() => setPendingDeactivate(row)}
                type="button"
              >
                {isArabic ? 'إيقاف' : 'Deactivate'}
              </button>
            </>
          ) : (
            <span className="text-xs text-slate-500">{isArabic ? 'عرض فقط' : 'View only'}</span>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="page-section space-y-6">
      <PageHeader
        title={isArabic ? 'إدارة تصنيفات الخدمات' : 'Service Category Management'}
        eyebrow={isArabic ? 'كتالوج الخدمات' : 'Service Catalog'}
        icon={FolderTree}
        description={isArabic ? 'إدارة التصنيفات الهرمية التي تتحكم في الكتالوج العام ومسار الطلب والبحث الداخلي.' : 'Manage the hierarchical categories that drive the public catalog, ordering flow, and support lookup.'}
        actions={
          canManage ? (
            <button className="btn-primary" onClick={openCreateForm} type="button">
              {isArabic ? '+ تصنيف جديد' : '+ New Category'}
            </button>
          ) : null
        }
      />

      <DataTable
        columns={columns}
        rows={categories}
        loading={loading}
        emptyTitle={isArabic ? 'لا توجد تصنيفات' : 'No categories found'}
        emptyDescription={isArabic ? 'أنشئ أول تصنيف لتنظيم الكتالوج.' : 'Create the first service category to organize the catalog.'}
        toolbar={
          <div className="grid gap-3 md:grid-cols-3">
            <select
              className="field"
              value={filters.is_active}
              onChange={(event) => setFilters((current) => ({ ...current, is_active: event.target.value }))}
            >
              <option value="">{isArabic ? 'جميع الحالات' : 'All statuses'}</option>
              <option value="true">{isArabic ? 'مفعّل' : 'Active'}</option>
              <option value="false">{isArabic ? 'موقف' : 'Inactive'}</option>
            </select>
            <select
              className="field"
              value={filters.show_on_public_site}
              onChange={(event) => setFilters((current) => ({ ...current, show_on_public_site: event.target.value }))}
            >
              <option value="">{isArabic ? 'جميع مستويات الظهور' : 'All visibility'}</option>
              <option value="true">{isArabic ? 'عام' : 'Public'}</option>
              <option value="false">{isArabic ? 'داخلي فقط' : 'Internal only'}</option>
            </select>
            <select
              className="field"
              value={filters.parent}
              onChange={(event) => setFilters((current) => ({ ...current, parent: event.target.value }))}
            >
              <option value="">{isArabic ? 'جميع الأصول' : 'All parents'}</option>
              <option value="root">{isArabic ? 'التصنيفات الرئيسية' : 'Root categories'}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.full_path_name || category.name_ar}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {canManage ? (
        <p className="text-sm text-slate-500">
          {isArabic
            ? 'لإيقاف أي تصنيف افتح التعديل ثم استخدم زر الإيقاف الأحمر، أو استخدم زر الإيقاف من عمود الإجراءات.'
            : 'To deactivate a category, open its edit form and use the red deactivate button, or use the deactivate action in the table.'}
        </p>
      ) : null}

      <FormModal
        open={isFormOpen}
        onClose={closeForm}
        size="lg"
        title={selectedCategory ? (isArabic ? 'تعديل التصنيف' : 'Edit Service Category') : (isArabic ? 'تصنيف جديد' : 'New Service Category')}
        description={isArabic ? 'استخدم التصنيفات الأصلية للتسلسل الهرمي، واحتفظ بالتصنيفات الداخلية مخفية عن الكتالوج العام.' : 'Use parent categories for hierarchy and keep internal-only categories hidden from the public catalog.'}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            {selectedCategory && canManage ? (
              <button
                className="btn-danger"
                onClick={() => {
                  setPendingDeactivate(selectedCategory)
                  closeForm()
                }}
                type="button"
              >
                {isArabic ? 'إيقاف التصنيف' : 'Deactivate category'}
              </button>
            ) : null}
            <button className="btn-secondary" onClick={closeForm} type="button">
              {isArabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button className="btn-primary min-w-40" disabled={submitting} form="service-category-management-form" type="submit">
              {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {selectedCategory ? (isArabic ? 'حفظ التعديلات' : 'Save Changes') : (isArabic ? 'إنشاء التصنيف' : 'Create Category')}
            </button>
          </div>
        }
      >
        <form className="space-y-4" id="service-category-management-form" onSubmit={form.handleSubmit(handleSubmit)}>
          <input type="hidden" {...form.register('slug')} />
          <input type="hidden" {...form.register('icon')} />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={isArabic ? 'الاسم بالعربية' : 'Arabic name'}>
              <input className="field" {...form.register('name_ar', { required: true })} />
            </Field>
            <Field label={isArabic ? 'الاسم بالإنجليزية' : 'English name'}>
              <input className="field" {...form.register('name_en')} />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label={isArabic ? 'المعرّف (Slug)' : 'Slug'}
              hint={isArabic ? 'يتم توليده تلقائياً من اسم التصنيف.' : 'Generated automatically from the category name.'}
            >
              <input className="field cursor-not-allowed bg-slate-50 font-mono text-slate-600" readOnly value={generatedSlug} />
            </Field>
            <Field label={isArabic ? 'التصنيف الأصلي' : 'Parent category'}>
              <select className="field" {...form.register('parent_id')}>
                <option value="">{isArabic ? 'بدون تصنيف أصلي' : 'Root category'}</option>
                {parentOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.full_path_name || category.name_ar}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label={isArabic ? 'الأيقونة' : 'Icon'}
              hint={isArabic ? 'يتم اختيارها تلقائياً حسب اسم التصنيف.' : 'Selected automatically from the category name.'}
            >
              <input className="field cursor-not-allowed bg-slate-50 text-slate-600" readOnly value={generatedIcon} />
            </Field>
            <Field label={isArabic ? 'اللون' : 'Color'} hint={isArabic ? 'مثال: #0f766e' : 'Example: #0f766e'}>
              <input className="field" {...form.register('color')} />
            </Field>
          </div>
          <Field label={isArabic ? 'الوصف' : 'Description'}>
            <textarea className="field min-h-24" {...form.register('description_ar')} />
          </Field>
          <Field label={isArabic ? 'ترتيب العرض' : 'Sort order'}>
            <input className="field" type="number" {...form.register('sort_order')} />
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <CheckboxField label={isArabic ? 'التصنيف مفعّل' : 'Category is active'} registration={form.register('is_active')} />
            <CheckboxField label={isArabic ? 'ظاهر في الموقع العام' : 'Show on public site'} registration={form.register('show_on_public_site')} />
          </div>
        </form>
      </FormModal>

      <ConfirmModal
        open={!!pendingDeactivate}
        onClose={() => setPendingDeactivate(null)}
        onConfirm={handleDeactivateConfirm}
        title={isArabic ? 'إيقاف التصنيف' : 'Deactivate Service Category'}
        description={isArabic ? 'سيتوقف التصنيف عن الظهور في شاشات الطلب العامة وشاشات العملاء. يجب نقل الخدمات الفعّالة أو إيقافها أولاً.' : 'The category will stop appearing on public and client ordering screens. Active services must be moved or deactivated first.'}
        confirmLabel={isArabic ? 'إيقاف' : 'Deactivate'}
        variant="danger"
      />
    </div>
  )
}

export default ServiceCategoryManagementPage
