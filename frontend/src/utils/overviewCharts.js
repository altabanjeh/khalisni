import { getStatusLabel } from './format'
import { getAdminName } from './servicePresentation'

// Distinct, colour-blind-friendly slice colours (blue, teal, amber, violet, rose).
export const SERVICE_SLICE_COLORS = ['#146ef0', '#0f9d8f', '#d97706', '#7c3aed', '#e11d48', '#64748b']

// DEF-A05: chart rows carry localized labels. The dashboard API returns only
// `service__name_ar`; in English the name is resolved through the catalogue.
export function buildOverviewChartData(data, language, catalogue = []) {
  const statusRows = (data?.orders_by_status || []).map((row) => ({
    ...row,
    total: Number(row.total) || 0,
    label: getStatusLabel(row.status, language),
  }))
  const byArabicName = new Map((catalogue || []).map((service) => [service.name_ar, service]))
  const serviceRows = (data?.top_services || []).map((row, index) => {
    const arabic = row.service__name_ar || ''
    const record = { name_ar: arabic, name_en: row.service__name_en || byArabicName.get(arabic)?.name_en || '' }
    return {
      ...row,
      total: Number(row.total) || 0,
      label: getAdminName(record, language, language === 'en' ? 'Unnamed service' : 'خدمة بلا اسم'),
      color: SERVICE_SLICE_COLORS[index % SERVICE_SLICE_COLORS.length],
    }
  })
  return { statusRows, serviceRows }
}
