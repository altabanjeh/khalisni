import { getServiceSchemaFields } from '../utils/serviceForms'

function DynamicServiceFields({ service, register, errors = {} }) {
  const fields = getServiceSchemaFields(service)

  if (!fields.length) return null

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const validationRules =
          field.type === 'checkbox'
            ? {
                validate: field.required ? (value) => value || `الحقل ${field.label} مطلوب` : undefined,
              }
            : {
                required: field.required ? `الحقل ${field.label} مطلوب` : false,
              }

        return (
          <div key={field.inputName}>
            <label className="mb-2 block text-sm font-semibold text-ink">{field.label}</label>
            {field.type === 'textarea' ? (
              <textarea className="field min-h-24" placeholder={field.placeholder} {...register(field.inputName, validationRules)} />
            ) : null}
            {field.type === 'select' ? (
              <select className="field" {...register(field.inputName, validationRules)}>
                <option value="">اختر القيمة</option>
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
