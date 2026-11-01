import type { ApiError } from '../types/common';
import type { OrderComplaint } from '../types/order';

// Customer complaints on an order: GET/POST /api/customer/orders/<id>/complaints/
// with POST body {"description": "..."} (backend orders/complaints.py, max 4000
// characters). Staff resolve a complaint from the staff order page; the customer
// sees whether each one is still being followed up or has been handled.
export const COMPLAINT_MAX_LENGTH = 4000;
export const COMPLAINT_STATUS_OPEN = 'قيد المتابعة';
export const COMPLAINT_STATUS_RESOLVED = 'تمت المعالجة';

export function complaintStatusLabel(complaint: Pick<OrderComplaint, 'is_resolved'>) {
  return complaint.is_resolved ? COMPLAINT_STATUS_RESOLVED : COMPLAINT_STATUS_OPEN;
}

export function validateComplaint(text: string) {
  const value = String(text ?? '').trim();
  if (!value) return 'اكتب تفاصيل الشكوى أولاً.';
  if (value.length > COMPLAINT_MAX_LENGTH) return `الشكوى أطول من المسموح (${COMPLAINT_MAX_LENGTH} حرف).`;
  return null;
}

export function buildComplaintPayload(text: string) {
  return { description: String(text ?? '').trim() };
}

export type ComplaintsLoadResult = { state: 'ok'; complaints: OrderComplaint[] } | { state: 'unavailable' };

/** A backend without the endpoint (404/405) is a state, not an error. */
export async function loadComplaints(
  orderId: number | string,
  fetcher: (orderId: number | string) => Promise<OrderComplaint[]>,
): Promise<ComplaintsLoadResult> {
  try {
    const complaints = await fetcher(orderId);
    return { state: 'ok', complaints: [...(complaints ?? [])].sort((a, b) => (Date.parse(a.created_at ?? '') || 0) - (Date.parse(b.created_at ?? '') || 0) || a.id - b.id) };
  } catch (error) {
    const status = (error as ApiError | null)?.status;
    if (status === 404 || status === 405) return { state: 'unavailable' };
    throw error;
  }
}
