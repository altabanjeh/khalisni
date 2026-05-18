export function formatDate(value?: string | null) {
  if (!value) return 'غير متوفر';
  try {
    return new Intl.DateTimeFormat('ar-JO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function formatDateTime(value?: string | null) {
  if (!value) return 'غير متوفر';
  try {
    return new Intl.DateTimeFormat('ar-JO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function formatCurrency(value?: number | null) {
  if (value === null || value === undefined) return 'غير محدد';
  try {
    return new Intl.NumberFormat('en-JO', {
      style: 'currency',
      currency: 'JOD',
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} JOD`;
  }
}
