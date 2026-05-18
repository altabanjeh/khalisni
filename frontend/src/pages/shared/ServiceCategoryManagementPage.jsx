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
import { useToast } from '../../context/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { hasPermission } from '../../utils/authz'

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
        slug: values.slug.trim(),
        parent_id: values.parent_id ? Number(values.parent_id) : null,
        description_ar: values.description_ar.trim(),
        description_en: values.description_en.trim(),
        icon: values.icon.trim(),
        color: values.color.trim(),
        sort_order: Number(values.sort_order || 0),
        is_active: Boolean(values.is_active),
        show_on_public_site: Boolean(values.show_on_public_site),
      }

      if (selectedCategory) {
        await api.updateAdminCategory(selectedCategory.id, payload)
        toast('Service category updated.', 'success')
      } else {
        await api.createAdminCategory(payload)
        toast('Service category created.', 'success')
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
      toast('Service category deactivated.', 'success')
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
    { key: 'name_ar', label: 'Category' },
    { key: 'parent_name', label: 'Parent', render: (row) => row.parent_name || 'Root' },
    { key: 'sort_order', label: 'Order' },
    { key: 'show_on_public_site', label: 'Public', render: (row) => (row.show_on_public_site ? 'Visible' : 'Internal') },
    { key: 'is_active', label: 'Status', render: (row) => (row.is_active ? 'Active' : 'Inactive') },
    { key: 'active_services_count', label: 'Services' },
    {
      key: 'services_preview',
      label: 'Service Preview',
      render: (row) =>
        row.services_preview?.length ? row.services_preview.map((service) => service.name_ar).join(', ') : 'No active services',
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          {canManage ? (
            <>
              <button className="btn-secondary px-3 py-2 text-xs" onClick={() => openEditForm(row.id)} type="button">
                Edit
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
                Deactivate
              </button>
            </>
          ) : (
            <span className="text-xs text-slate-500">View only</span>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="page-section space-y-6">
      <PageHeader
        title="Service Category Management"
        eyebrow="Service Catalog"
        icon={FolderTree}
        description="Manage hierarchical categories that control the public catalog, client ordering flow, support lookup, and category-based reporting."
        actions={
          canManage ? (
            <button className="btn-primary" onClick={openCreateForm} type="button">
              + New Category
            </button>
          ) : null
        }
      />

      <DataTable
        columns={columns}
        rows={categories}
        loading={loading}
        emptyTitle="No categories found"
        emptyDescription="Create the first service category to organize the catalog."
        toolbar={
          <div className="grid gap-3 md:grid-cols-3">
            <select
              className="field"
              value={filters.is_active}
              onChange={(event) => setFilters((current) => ({ ...current, is_active: event.target.value }))}
            >
              <option value="">All statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <select
              className="field"
              value={filters.show_on_public_site}
              onChange={(event) => setFilters((current) => ({ ...current, show_on_public_site: event.target.value }))}
            >
              <option value="">All visibility</option>
              <option value="true">Public</option>
              <option value="false">Internal only</option>
            </select>
            <select
              className="field"
              value={filters.parent}
              onChange={(event) => setFilters((current) => ({ ...current, parent: event.target.value }))}
            >
              <option value="">All parents</option>
              <option value="root">Root categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.full_path_name || category.name_ar}
                </option>
              ))}
            </select>
          </div>
        }
      />

      <FormModal
        open={isFormOpen}
        onClose={closeForm}
        size="lg"
        title={selectedCategory ? 'Edit Service Category' : 'New Service Category'}
        description="Use parent categories for hierarchy and keep internal-only categories hidden from the public catalog."
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn-secondary" onClick={closeForm} type="button">
              Cancel
            </button>
            <button className="btn-primary min-w-40" disabled={submitting} form="service-category-management-form" type="submit">
              {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {selectedCategory ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        }
      >
        <form className="space-y-4" id="service-category-management-form" onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Arabic name">
              <input className="field" {...form.register('name_ar', { required: true })} />
            </Field>
            <Field label="English name">
              <input className="field" {...form.register('name_en')} />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Slug" hint="Leave blank to generate it from the name.">
              <input className="field" {...form.register('slug')} />
            </Field>
            <Field label="Parent category">
              <select className="field" {...form.register('parent_id')}>
                <option value="">Root category</option>
                {parentOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.full_path_name || category.name_ar}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Icon">
              <input className="field" {...form.register('icon')} />
            </Field>
            <Field label="Color" hint="Example: #0f766e">
              <input className="field" {...form.register('color')} />
            </Field>
          </div>
          <Field label="Description">
            <textarea className="field min-h-24" {...form.register('description_ar')} />
          </Field>
          <Field label="Sort order">
            <input className="field" type="number" {...form.register('sort_order')} />
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <CheckboxField label="Category is active" registration={form.register('is_active')} />
            <CheckboxField label="Show on public site" registration={form.register('show_on_public_site')} />
          </div>
        </form>
      </FormModal>

      <ConfirmModal
        open={!!pendingDeactivate}
        onClose={() => setPendingDeactivate(null)}
        onConfirm={handleDeactivateConfirm}
        title="Deactivate Service Category"
        description="The category will stop appearing on public and client ordering screens. Active services must be moved or deactivated first."
        confirmLabel="Deactivate"
        variant="danger"
      />
    </div>
  )
}

export default ServiceCategoryManagementPage
