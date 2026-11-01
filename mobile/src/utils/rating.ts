import type { Order } from '../types/order';

// POST /api/customer/orders/<id>/rating/ with {score: 1..5, comment?}. The
// backend accepts one rating per COMPLETED order (orders/services.py
// create_customer_rating) and returns it afterwards as `order.rating`.
export const RATING_SCORES = [1, 2, 3, 4, 5] as const;
export const RATING_LABELS_AR: Record<number, string> = {
  1: 'سيئة',
  2: 'مقبولة',
  3: 'جيدة',
  4: 'جيدة جداً',
  5: 'ممتازة',
};

export function canRateOrder(order?: Pick<Order, 'status' | 'rating'> | null) {
  return Boolean(order && order.status === 'COMPLETED' && !order.rating);
}

export function validateRating(score: number | null | undefined) {
  if (!score || !Number.isInteger(score) || score < 1 || score > 5) return 'اختر تقييماً من ١ إلى ٥ نجوم.';
  return null;
}

export function buildRatingPayload(score: number, comment?: string | null) {
  const payload: { score: number; comment?: string } = { score };
  const text = String(comment ?? '').trim();
  if (text) payload.comment = text;
  return payload;
}
