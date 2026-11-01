// Mobile repeater + upload-limit harness: client logic only (no React Native rendering).
const sf = require('./serviceForms.cjs')
const results = []
const check = (id, name, pass, evidence) => results.push({ id, name, pass: Boolean(pass), evidence })
const gate = 'field_2fa52c6cfa'
const service = { required_information_schema: [
  { key: 'partners_count', type: 'number', label_ar: 'عدد الشركاء', required: true },
  { key: 'partners', type: 'repeater', label_ar: 'بيانات الشركاء', label_en: 'Partners details', required: true, min_items: 1, max_items: 20,
    help_text_ar: 'حسب عدد الشركاء',
    item_fields: [
      { key: 'name', type: 'text', label_ar: 'اسم كل شريك', required: true },
      { key: 'id', type: 'text', label_ar: 'الرقم الوطني / رقم الجواز للشريك', required: true },
      { key: 'nationality', type: 'text', label_ar: 'جنسية كل شريك', required: true },
      { key: 'share', type: 'text', label_ar: 'حصة كل شريك', required: true },
    ] },
  { key: gate, type: 'select', label_ar: 'هل تعرف رقم القطعة والحوض؟', options: [{ value: 'yes', label_ar: 'نعم' }, { value: 'no', label_ar: 'لا' }] },
  { key: 'plots', type: 'repeater', label_ar: 'أرقام القطع المطلوب توحيدها', required: true, min_items: 2, max_items: 99,
    visible_when: { field: gate, equals: 'yes' },
    item_fields: [
      { key: 'parcel_number', type: 'text', label_ar: 'رقم القطعة', required: true, visible_when: { field: 'x', equals: 'y' } },
      { key: 'basin_number', type: 'text', label_ar: 'رقم الحوض', required: true },
    ] },
] }
const fields = sf.getServiceSchemaFields(service)
const partners = fields.find((f) => f.key === 'partners')
const plots = fields.find((f) => f.key === 'plots')
check('R01', 'repeater type and item fields normalized', partners.type === 'repeater' && partners.itemFields.length === 4 && partners.itemFields[1].key === 'id' && partners.itemFields[0].label === 'اسم كل شريك', partners.itemFields.map((f) => f.key))
check('R02', 'max_items capped at 20; min kept', plots.maxItems === 20 && plots.minItems === 2, { max: plots.maxItems, min: plots.minItems })
check('R03', 'item fields drop visible_when and never become repeaters', plots.itemFields[0].visibleWhen === null && plots.itemFields.every((f) => f.type !== 'repeater'), plots.itemFields[0].visibleWhen)
check('R04', 'initial rows = effective minimum', sf.initialRepeaterRows(partners).length === 1 && sf.initialRepeaterRows(plots).length === 2, null)

const values = { service_info_partners_count: '٢', [`service_info_${gate}`]: 'no' }
const rows = { service_info_partners: [{ name: ' أحمد ', id: '9981', nationality: 'أردني', share: '50' }, { name: 'سارة' }] }
const hidden = sf.buildServiceAnswers(fields, values, rows)
check('R05', 'hidden repeater (gate=no) not sent; rows sent in order incl. partial row', !('plots' in hidden) && Array.isArray(hidden.partners) && hidden.partners.length === 2 && hidden.partners[0].name === 'أحمد' && JSON.stringify(hidden.partners[1]) === '{"name":"سارة"}', hidden)
const shown = sf.buildServiceAnswers(fields, { ...values, [`service_info_${gate}`]: 'yes' }, { ...rows, service_info_plots: [{ parcel_number: '012', basin_number: '3' }, {}] })
check('R06', 'visible repeater sends all rows, blank row as {} (indices match server), leading zero kept', shown.plots.length === 2 && shown.plots[0].parcel_number === '012' && JSON.stringify(shown.plots[1]) === '{}', shown.plots)
const untouched = sf.buildServiceAnswers(fields, { ...values, [`service_info_${gate}`]: 'yes' }, {})
check('R07', 'untouched required repeater sends its initial blank rows', untouched.plots.length === 2, untouched.plots)

const errs = sf.validateRepeaterRows(partners, rows.service_info_partners)
check('R08', 'client validation: required cells per row', errs['service_info_partners.1.id'] === 'الرقم الوطني / رقم الجواز للشريك مطلوب.' && !errs['service_info_partners.0.name'], errs)
const few = sf.validateRepeaterRows(plots, [{ parcel_number: '1', basin_number: '2' }])
check('R09', 'client validation: minimum rows (Arabic)', few.service_info_plots === 'أضف إدخالين على الأقل في أرقام القطع المطلوب توحيدها.', few)
const many = sf.validateRepeaterRows(plots, Array.from({ length: 21 }, () => ({ parcel_number: '1', basin_number: '2' })))
check('R10', 'client validation: maximum rows (Arabic)', /أكثر من 20/.test(many.service_info_plots || ''), many.service_info_plots)
const none = sf.validateRepeaterRows(partners, [])
check('R11', 'client validation: required repeater with no rows', none.service_info_partners === 'بيانات الشركاء مطلوب.', none)
const optional = sf.getServiceSchemaFields({ required_information_schema: [{ key: 'o', type: 'repeater', label_ar: 'اختياري', min_items: 2, item_fields: [{ key: 'a', type: 'text', label_ar: 'أ' }] }] })[0]
check('R12', 'optional repeater: zero rows OK, 1 row below min refused, starts empty', Object.keys(sf.validateRepeaterRows(optional, [])).length === 0 && !!sf.validateRepeaterRows(optional, [{ a: 'x' }]).service_info_o && sf.initialRepeaterRows(optional).length === 0, null)

const perRow = sf.mapRepeaterServerError(plots, { 1: { basin_number: 'هذا الحقل مطلوب.' }, 0: { ghost: 'هذا الحقل ليس من نموذج الخدمة.' } })
check('R13', 'server per-row errors placed under the cell; unknown item to general', perRow.placed['service_info_plots.1.basin_number'] === 'هذا الحقل مطلوب.' && perRow.general.length === 1, perRow)
const whole = sf.mapRepeaterServerError(plots, 'أضف 2 إدخالات على الأقل.')
check('R14', 'server whole-field string error placed on the repeater', whole.placed.service_info_plots === 'أضف 2 إدخالات على الأقل.', whole)
const listWhole = sf.mapRepeaterServerError(plots, ['هذا الحقل مطلوب.'])
check('R15', 'server whole-field list error placed on the repeater', listWhole.placed.service_info_plots === 'هذا الحقل مطلوب.', listWhole)

const drawings = { document_type: 'document_3443627d36', name_ar: 'المخططات الهندسية', allowed_extensions: ['.pdf'], max_file_size: 50 * 1024 * 1024 }
check('U01', 'upload hint shows the requirement limit (50 MB)', sf.buildUploadHint(drawings).endsWith('الحد الأقصى: 50 MB'), sf.buildUploadHint(drawings))
check('U02', '30 MB drawing accepted under a 50 MB requirement', sf.validateUploadableFile({ uri: 'f', name: 'plan.pdf', size: 30 * 1024 * 1024 }, drawings) === null, null)
const big = sf.validateUploadableFile({ uri: 'f', name: 'plan.pdf', size: 51 * 1024 * 1024 }, drawings)
check('U03', '51 MB drawing refused with the 50 MB limit', /50 MB/.test(big || ''), big)
check('U04', 'default 10 MB when the requirement carries no limit', /10 MB/.test(sf.buildUploadHint({ document_type: 'x' })) && !!sf.validateUploadableFile({ uri: 'f', name: 'a.pdf', size: 11 * 1024 * 1024 }, { document_type: 'x' }), sf.buildUploadHint({ document_type: 'x' }))

const failed = results.filter((r) => !r.pass)
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'} ${r.id} ${r.name}${r.pass ? '' : ' :: ' + JSON.stringify(r.evidence)}`)
console.log(`${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
