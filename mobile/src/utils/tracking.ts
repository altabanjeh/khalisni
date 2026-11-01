import type { ApiError } from '../types/common';
import type { TrackOrderResult } from '../types/order';
import { GENERIC_REQUIRED_DOCUMENT_LABEL } from './documentPresentation';
import { getStatusLabel } from './status';
import { toLatinDigits } from './format';

// Public order tracking: GET /api/orders/track/?order_number=&phone= (backend
// orders/views.py TrackOrderAPIView). Both values are required; the phone is
// compared as a canonical number on the server, so 079..., +96279... and
// 0096279... all match. A wrong pair is a plain 404 (no hint which part is wrong).
export const TRACK_NOT_FOUND_MESSAGE = 'لم نجد طلباً بهذا الرقم ورقم الهاتف. تحقق من البيانات وحاول مرة أخرى.';

export interface TrackInput {
  orderNumber: string;
  phone: string;
}

export function validateTrackInput(input: TrackInput) {
  const errors: { orderNumber?: string; phone?: string } = {};
  if (!input.orderNumber.trim()) errors.orderNumber = 'رقم الطلب مطلوب.';
  if (!input.phone.trim()) errors.phone = 'رقم الهاتف مطلوب.';
  return errors;
}

/**
 * Query parameters for the tracking request. Order numbers are issued as
 * "KH-<year>-<number>" in upper case, so the typed value is trimmed, Arabic
 * digits are read as Latin digits and letters are upper-cased.
 */
export function buildTrackParams(input: TrackInput) {
  return {
    order_number: toLatinDigits(input.orderNumber).trim().toUpperCase(),
    phone: input.phone.trim(),
  };
}

export function describeTrackError(error: ApiError) {
  if (error.status === 404) return TRACK_NOT_FOUND_MESSAGE;
  return error.message;
}

/** What the tracking screen shows: Arabic status, missing documents by Arabic name, upload prompt. */
export function summarizeTracking(result: TrackOrderResult) {
  const details = Array.isArray(result.missing_document_details) ? result.missing_document_details : [];
  const missingDocuments = details.length
    ? details.map((item) => {
        const name = String(item?.name_ar ?? '').trim();
        return name && /[؀-ۿ]/.test(name) ? name : GENERIC_REQUIRED_DOCUMENT_LABEL;
      })
    : (result.missing_documents ?? []).map(() => GENERIC_REQUIRED_DOCUMENT_LABEL);
  return {
    orderNumber: result.order_number,
    statusLabel: getStatusLabel(result.status),
    missingDocuments,
    needsCustomerUpload: result.status === 'WAITING_CUSTOMER' && missingDocuments.length > 0,
    finalDocumentsCount: Array.isArray(result.final_documents) ? result.final_documents.length : 0,
    timeline: Array.isArray(result.timeline) ? result.timeline : [],
  };
}
