import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import DynamicServiceFields from './DynamicServiceFields'
import FileUploader from './FileUploader'
import { LanguageProvider } from '../context/LanguageContext'
import { LANGUAGE_STORAGE_KEY } from '../utils/i18n'
import { buildServiceAnswers, getServiceSchemaFields } from '../utils/serviceForms'

const GATE = 'field_2fa52c6cfa'
const CONSOLIDATION = {
  required_information_schema: [
    {
      key: GATE, type: 'select', label_ar: 'هل تعرف رقم القطعة والحوض؟', label_en: 'Do you know the parcel and basin numbers?', required: false,
      options: [{ value: 'yes', label_ar: 'نعم', label_en: 'Yes' }, { value: 'no', label_ar: 'لا', label_en: 'No' }],
    },
    {
      key: 'plots', type: 'repeater', label_ar: 'أرقام القطع المطلوب توحيدها', label_en: 'Numbers of the plots to consolidate',
      required: true, min_items: 2, max_items: 3, visible_when: { field: GATE, equals: 'yes' },
      item_fields: [
        { key: 'parcel_number', type: 'text', label_ar: 'رقم القطعة', label_en: 'Parcel number', required: true },
        { key: 'basin_number', type: 'text', label_ar: 'رقم الحوض', label_en: 'Basin number', required: true },
      ],
    },
  ],
}
const COMPANY = {
  required_information_schema: [
    {
      key: 'partners', type: 'repeater', label_ar: 'بيانات الشركاء', label_en: "Partners' details", required: true, min_items: 1, max_items: 20,
      item_fields: [
        { key: 'name', type: 'text', label_ar: 'اسم كل شريك', label_en: 'Name of each partner', required: true },
        { key: 'id', type: 'text', label_ar: 'الرقم الوطني / رقم الجواز للشريك', label_en: "Partner's national ID / passport number", required: true },
      ],
    },
  ],
}

function Form({ service, onValid, language = 'ar' }) {
  const { register, control, handleSubmit, watch, formState: { errors } } = useForm({ mode: 'onSubmit' })
  const fields = getServiceSchemaFields(service, language)
  return (
    <form onSubmit={handleSubmit((values) => onValid(buildServiceAnswers(fields, values)))}>
      <DynamicServiceFields control={control} errors={errors} register={register} service={service} watch={watch} />
      <button type="submit">submit</button>
    </form>
  )
}

afterEach(() => {
  window.localStorage.removeItem(LANGUAGE_STORAGE_KEY)
})

test('plots stay hidden until the parcel gate is "yes", then start with the minimum rows', async () => {
  const user = userEvent.setup()
  const onValid = vi.fn()
  render(<Form onValid={onValid} service={CONSOLIDATION} />)

  expect(screen.queryByTestId('repeater-plots')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'submit' }))
  await waitFor(() => expect(onValid).toHaveBeenCalledWith({}))

  await user.selectOptions(screen.getByRole('combobox'), 'yes')
  const group = await screen.findByTestId('repeater-plots')
  expect(within(group).getAllByLabelText(/رقم القطعة/)).toHaveLength(2)
  // At the minimum of two rows no row can be removed.
  expect(within(group).getByRole('button', { name: 'حذف الإدخال 1 من أرقام القطع المطلوب توحيدها' })).toBeDisabled()
})

test('rows are added up to max_items, removed down to the minimum, and each required item is checked', async () => {
  const user = userEvent.setup()
  const onValid = vi.fn()
  render(<Form onValid={onValid} service={CONSOLIDATION} />)
  await user.selectOptions(screen.getByRole('combobox'), 'yes')
  const group = await screen.findByTestId('repeater-plots')
  const add = within(group).getByRole('button', { name: 'إضافة إدخال إلى أرقام القطع المطلوب توحيدها' })

  await user.click(add)
  expect(within(group).getAllByLabelText(/رقم القطعة/)).toHaveLength(3)
  expect(add).toBeDisabled()
  expect(within(group).getByText('وصلت إلى الحد الأقصى لعدد الإدخالات.')).toBeInTheDocument()

  await user.click(within(group).getByRole('button', { name: 'حذف الإدخال 3 من أرقام القطع المطلوب توحيدها' }))
  expect(within(group).getAllByLabelText(/رقم القطعة/)).toHaveLength(2)
  expect(add).not.toBeDisabled()

  // Empty required items block the submit, with the message under the item.
  await user.click(screen.getByRole('button', { name: 'submit' }))
  expect(await within(group).findAllByText('الحقل رقم القطعة مطلوب')).toHaveLength(2)
  expect(onValid).not.toHaveBeenCalled()
  const firstParcel = within(group).getAllByLabelText(/رقم القطعة/)[0]
  expect(firstParcel).toHaveAttribute('aria-invalid', 'true')

  const parcels = within(group).getAllByLabelText(/رقم القطعة/)
  const basins = within(group).getAllByLabelText(/رقم الحوض/)
  await user.type(parcels[0], '012')
  await user.type(basins[0], '7')
  await user.type(parcels[1], '013')
  await user.type(basins[1], '7')
  await user.click(screen.getByRole('button', { name: 'submit' }))
  await waitFor(() => expect(onValid).toHaveBeenCalledWith({
    [GATE]: 'yes',
    plots: [{ parcel_number: '012', basin_number: '7' }, { parcel_number: '013', basin_number: '7' }],
  }))
})

test('English layout labels the add and remove buttons in English', async () => {
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en')
  const user = userEvent.setup()
  render(
    <LanguageProvider>
      <Form language="en" onValid={vi.fn()} service={COMPANY} />
    </LanguageProvider>,
  )
  const group = await screen.findByTestId('repeater-partners')
  expect(within(group).getByText("Partners' details")).toBeInTheDocument()
  expect(within(group).getByText('Entry 1')).toBeInTheDocument()
  expect(within(group).getByLabelText(/Name of each partner/)).toBeInTheDocument()
  await user.click(within(group).getByRole('button', { name: "Add entry to Partners' details" }))
  expect(within(group).getByText('Entry 2')).toBeInTheDocument()
  const remove = within(group).getByRole('button', { name: "Remove entry 2 from Partners' details" })
  expect(remove).not.toBeDisabled()
  expect(remove.className).toContain('min-h-[44px]')
  await user.click(remove)
  expect(within(group).queryByText('Entry 2')).not.toBeInTheDocument()
})

test('the uploader accepts a file up to the requirement limit and refuses one above it', async () => {
  const user = userEvent.setup()
  render(<FileUploader label="المخططات الهندسية" maxSize={50 * 1024 * 1024} name="drawings" register={() => ({ name: 'drawings', onChange: () => {}, ref: () => {} })} />)
  const input = document.querySelector('input[type="file"]')
  const big = new File(['x'], 'plans.pdf', { type: 'application/pdf' })
  Object.defineProperty(big, 'size', { value: 30 * 1024 * 1024 })
  await user.upload(input, big)
  expect(screen.queryByText(/يتجاوز الحد الأقصى/)).not.toBeInTheDocument()

  const huge = new File(['x'], 'huge.pdf', { type: 'application/pdf' })
  Object.defineProperty(huge, 'size', { value: 60 * 1024 * 1024 })
  await user.upload(input, huge)
  expect(await screen.findByText(/الملف "huge.pdf" يتجاوز الحد الأقصى المسموح \(50.0 MB\)/)).toBeInTheDocument()
})
