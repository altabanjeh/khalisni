import type { ApiError } from '../types/common';
import type { OrderMessage } from '../types/order';

// Customer ↔ support messages on an order: GET/POST
// /api/customer/orders/<id>/messages/ with POST body {"message": "..."},
// answered with {id, message, author_role ("customer" | "staff"), created_at}.
// A backend without the endpoint answers 404 (or 405); the screen then falls
// back to the order's customer-visible notes and hides the send box.
export const MESSAGE_MAX_LENGTH = 2000;

export function validateMessage(text: string) {
  const value = String(text ?? '').trim();
  if (!value) return 'اكتب رسالتك أولاً.';
  if (value.length > MESSAGE_MAX_LENGTH) return `الرسالة أطول من المسموح (${MESSAGE_MAX_LENGTH} حرف).`;
  return null;
}

export function buildMessagePayload(text: string) {
  return { message: String(text ?? '').trim() };
}

export function messageAuthorLabel(message: Pick<OrderMessage, 'author_role'>) {
  return message.author_role === 'customer' ? 'أنت' : 'فريق الدعم';
}

export function sortMessages(messages: OrderMessage[] | null | undefined) {
  return [...(messages ?? [])].sort((a, b) => {
    const left = Date.parse(a.created_at ?? '') || 0;
    const right = Date.parse(b.created_at ?? '') || 0;
    return left - right || a.id - b.id;
  });
}

export function isMessagingUnavailable(error: unknown) {
  const status = (error as ApiError | null)?.status;
  return status === 404 || status === 405 || status === 501;
}

export type MessagesLoadResult =
  | { state: 'ok'; messages: OrderMessage[] }
  | { state: 'unavailable' };

/** Loads the thread; a missing endpoint is a state, not an error. Other errors are rethrown. */
export async function loadOrderMessages(
  orderId: number | string,
  fetcher: (orderId: number | string) => Promise<OrderMessage[]>,
): Promise<MessagesLoadResult> {
  try {
    return { state: 'ok', messages: sortMessages(await fetcher(orderId)) };
  } catch (error) {
    if (isMessagingUnavailable(error)) return { state: 'unavailable' };
    throw error;
  }
}
