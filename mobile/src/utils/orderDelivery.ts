import type { Order, OrderDelivery } from '../types/order';
import type { ServiceDeliveryTime } from '../types/service';
import { formatDate } from './format';

// The approved sentence for services without a promised duration (backend
// services/catalogue_rules.py APPROVED_DELIVERY_NOTE, delivery mode
// "after_review"). Such orders have expected_delivery_date = null.
export const AFTER_REVIEW_DELIVERY_NOTE_AR = 'تُحدَّد مدة الإنجاز بعد مراجعة الطلب.';

/**
 * Expected delivery shown on the customer's order: the date when the order has
 * one; otherwise the service's own "confirmed after review" sentence (from its
 * public delivery_time payload) or the approved default sentence. Never a
 * placeholder date or number.
 */
export function describeExpectedDelivery(
  order: Pick<Order, 'expected_delivery_date'>,
  serviceDelivery?: ServiceDeliveryTime | null,
) {
  if (order.expected_delivery_date) return formatDate(order.expected_delivery_date);
  const label = String(serviceDelivery?.label_ar ?? '').trim();
  if (serviceDelivery?.mode === 'after_review' && label && /[؀-ۿ]/.test(label)) return label;
  return AFTER_REVIEW_DELIVERY_NOTE_AR;
}

// Arabic labels of the result delivery methods (backend orders/delivery.py
// METHOD_LABELS), used only when the payload carries no Arabic label.
const DELIVERY_METHOD_LABELS_AR: Record<string, string> = {
  electronic: 'تسليم إلكتروني (تنزيل النتيجة)',
  paper_pickup: 'تسليم ورقي - استلام',
  paper_courier: 'تسليم ورقي - توصيل',
};

/**
 * How the result reaches the customer, for the order detail next to the final
 * result: the Arabic method label and the staff's instructions. Nothing is
 * shown for the default electronic delivery without instructions.
 */
export function describeResultDelivery(delivery?: OrderDelivery | null) {
  if (!delivery?.delivery_method) return null;
  const instructions = String(delivery.delivery_instructions ?? '').trim();
  if (delivery.delivery_method === 'electronic' && !instructions) return null;
  const payloadLabel = String(delivery.delivery_method_label_ar ?? '').trim();
  const label = (payloadLabel && /[؀-ۿ]/.test(payloadLabel) ? payloadLabel : '')
    || DELIVERY_METHOD_LABELS_AR[delivery.delivery_method]
    || 'طريقة التسليم';
  return { label, instructions };
}
