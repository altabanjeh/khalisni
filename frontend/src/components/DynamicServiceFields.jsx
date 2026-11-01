import { useEffect, useId, useRef } from 'react'
import { useFieldArray } from 'react-hook-form'
import {
  canRemoveRepeaterRow,
  emptyRepeaterRow,
  getServiceSchemaFields,
  isSchemaFieldVisible,
  repeaterRowsToAdd,
} from '../utils/serviceForms'
import { useLanguage } from '../context/LanguageContext'

function errorMessage(error) {
  if (!error) return ''
  if (typeof error.message === 'string' && error.message) return error.message
  if (error.root && typeof error.root.message === 'string') return error.root.message
  return ''
}

/**
 * One item input inside a repeater row. A required item is required only while
 * the repeater itself is visible (its `visible_when` gate, e.g. the parcel
 * "do you know the numbers?" question for plots).
 */
function RepeaterItemInput({ item, name, field, schemaFields, register, error, isArabic }) {
  const inputId = useId()
  const helpId = `${inputId}-help`
  const errorId = `${inputId}-error`
  const requiredMessage = isArabic ? `الحقل ${item.label} مطلوب` : `${item.label} is required`
  const rules = {
    validate: (value, formValues) => {
      if (!item.required || !isSchemaFieldVisible(field, schemaFields, formValues)) return true
      if (item.type === 'checkbox') return Boolean(value) || requiredMessage
      return String(value ?? '').trim() !== '' || requiredMessage
    },
  }
  const message = errorMessage(error)
  const describedBy = [item.helpText ? helpId : '', message ? errorId : ''].filter(Boolean).join(' ') || undefined
  const common = {
    id: inputId,
    'aria-invalid': message ? 'true' : undefined,
    'aria-describedby': describedBy,
    'aria-required': item.required ? 'true' : undefined,
  }

  return (
    <div>
      {item.type === 'checkbox' ? (
        <label className="flex min-h-[44px] items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink" htmlFor={inputId}>
          <input type="checkbox" {...common} {...register(name, rules)} />
          <span>{item.placeholder || item.label}</span>
        </label>
      ) : (
        <>
          <label className="mb-1 block text-sm font-semibold text-ink" htmlFor={inputId}>
            {item.label}
            {item.required ? <span aria-hidden="true" className="ms-1 text-danger">*</span> : null}
          </label>
          {item.type === 'textarea' ? (
            <textarea className="field min-h-24" placeholder={item.placeholder} {...common} {...register(name, rules)} />
          ) : item.type === 'select' ? (
            <select className="field" {...common} {...register(name, rules)}>
              <option value="">{isArabic ? 'اختر القيمة' : 'Select a value'}</option>
              {item.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input className="field" placeholder={item.placeholder} type={item.type} {...common} {...register(name, rules)} />
          )}
        </>
      )}
      {item.helpText ? <p className="mt-1 text-xs text-slate-500" id={helpId}>{item.helpText}</p> : null}
      {message ? <p className="mt-1 text-sm text-danger" id={errorId} role="alert">{message}</p> : null}
    </div>
  )
}

/**
 * Repeater (client notes CN-BIZ-01 partners, CN-BIZ-04 plots): the customer
 * adds one row per partner / plot. Rows start at the effective minimum, never
 * go below it and never above `max_items` (hard cap 20, enforced by the server).
 */
function RepeaterField({ field, schemaFields, control, register, errors, isArabic }) {
  const { fields: rows, append, remove } = useFieldArray({ control, name: field.inputName })
  const seeded = useRef(false)
  const headingId = useId()
  const fieldErrors = errors?.[field.inputName]
  const wholeMessage = errorMessage(fieldErrors)

  useEffect(() => {
    // Start with the rows the form needs (at least one when required). The ref
    // keeps a double-run effect (React strict mode) from seeding twice.
    if (seeded.current) return
    seeded.current = true
    const missing = field.effectiveMin - rows.length
    if (missing > 0) {
      append(Array.from({ length: missing }, () => emptyRepeaterRow(field)), { shouldFocus: false })
    }
  }, [append, field, rows.length])

  const addCount = repeaterRowsToAdd(field, rows.length)
  const canAdd = addCount > 0
  const canRemove = canRemoveRepeaterRow(field, rows.length)
  const entryWord = isArabic ? 'الإدخال' : 'Entry'
  const limits = [
    field.minItems > 0 ? (isArabic ? `الحد الأدنى: ${field.minItems}` : `Minimum: ${field.minItems}`) : '',
    isArabic ? `الحد الأقصى: ${field.maxItems}` : `Maximum: ${field.maxItems}`,
  ].filter(Boolean).join(' · ')

  return (
    <fieldset aria-describedby={wholeMessage ? `${headingId}-error` : undefined} className="space-y-3 rounded-2xl border border-border p-4" data-testid={`repeater-${field.key}`}>
      <legend className="px-1 text-sm font-semibold text-ink" id={headingId}>
        {field.label}
        {field.required ? <span aria-hidden="true" className="ms-1 text-danger">*</span> : null}
      </legend>
      {field.helpText ? <p className="text-xs text-slate-500">{field.helpText}</p> : null}
      <p className="text-xs text-slate-500">{limits}</p>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">{isArabic ? 'لم تتم إضافة أي إدخال بعد.' : 'No entries added yet.'}</p>
      ) : null}

      {rows.map((row, index) => {
        const number = index + 1
        return (
          <fieldset className="space-y-3 rounded-xl border border-border bg-white p-3" key={row.id}>
            <legend className="px-1 text-sm font-bold text-ink">{`${entryWord} ${number}`}</legend>
            <div className="flex justify-end">
              <button
                aria-label={isArabic ? `حذف الإدخال ${number} من ${field.label}` : `Remove entry ${number} from ${field.label}`}
                className="btn-secondary min-h-[44px] min-w-[44px] px-3 text-sm"
                disabled={!canRemove}
                onClick={() => remove(index)}
                type="button"
              >
                {isArabic ? 'حذف' : 'Remove'}
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {field.itemFields.map((item) => (
                <RepeaterItemInput
                  error={fieldErrors?.[index]?.[item.inputKey]}
                  field={field}
                  isArabic={isArabic}
                  item={item}
                  key={item.inputKey}
                  name={`${field.inputName}.${index}.${item.inputKey}`}
                  register={register}
                  schemaFields={schemaFields}
                />
              ))}
            </div>
          </fieldset>
        )
      })}

      <button
        aria-label={isArabic ? `إضافة إدخال إلى ${field.label}` : `Add entry to ${field.label}`}
        className="btn-secondary min-h-[44px] px-4 text-sm"
        disabled={!canAdd}
        onClick={() => append(Array.from({ length: addCount }, () => emptyRepeaterRow(field)))}
        type="button"
      >
        {isArabic ? '+ إضافة إدخال' : '+ Add entry'}
      </button>
      {!canAdd ? (
        <p className="text-xs text-slate-500">{isArabic ? 'وصلت إلى الحد الأقصى لعدد الإدخالات.' : 'You have reached the maximum number of entries.'}</p>
      ) : null}
      {wholeMessage ? <p className="text-sm text-danger" id={`${headingId}-error`} role="alert">{wholeMessage}</p> : null}
    </fieldset>
  )
}

function DynamicServiceFields({ service, register, errors = {}, watch, control }) {
  const { language, isArabic } = useLanguage()
  const fields = getServiceSchemaFields(service, language)
  const values = typeof watch === 'function' ? watch() : {}

  if (!fields.length) return null

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        if (!isSchemaFieldVisible(field, fields, values)) return null
        if (field.type === 'repeater') {
          if (!control) return null
          return (
            <RepeaterField
              control={control}
              errors={errors}
              field={field}
              isArabic={isArabic}
              key={field.inputName}
              register={register}
              schemaFields={fields}
            />
          )
        }
        const requiredMessage = isArabic ? `الحقل ${field.label} مطلوب` : `${field.label} is required`
        const validationRules =
          field.type === 'checkbox'
            ? {
                validate: field.required ? (value) => value || requiredMessage : undefined,
              }
            : field.visibleWhen
              ? {
                  // Checked against the current answers: once the controlling
                  // answer changes, a hidden field is no longer required.
                  validate: (value, formValues) =>
                    !field.required || !isSchemaFieldVisible(field, fields, formValues) || String(value ?? '').trim() !== '' || requiredMessage,
                }
              : {
                  required: field.required ? requiredMessage : false,
                }

        return (
          <div key={field.inputName}>
            <label className="mb-2 block text-sm font-semibold text-ink">{field.label}</label>
            {field.type === 'textarea' ? (
              <textarea className="field min-h-24" placeholder={field.placeholder} {...register(field.inputName, validationRules)} />
            ) : null}
            {field.type === 'select' ? (
              <select className="field" {...register(field.inputName, validationRules)}>
                <option value="">{isArabic ? 'اختر القيمة' : 'Select a value'}</option>
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : null}
            {field.type === 'checkbox' ? (
              <label className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink">
                <input type="checkbox" {...register(field.inputName, validationRules)} />
                <span>{field.placeholder || field.label}</span>
              </label>
            ) : null}
            {!['textarea', 'select', 'checkbox'].includes(field.type) ? (
              <input
                className="field"
                placeholder={field.placeholder}
                type={field.type}
                {...register(field.inputName, validationRules)}
              />
            ) : null}
            {field.helpText ? <p className="mt-2 text-xs text-slate-500">{field.helpText}</p> : null}
            {errors[field.inputName] ? <p className="mt-2 text-sm text-danger">{errors[field.inputName].message}</p> : null}
          </div>
        )
      })}
    </div>
  )
}

export default DynamicServiceFields
