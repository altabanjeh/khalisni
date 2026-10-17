// Safe document download (audit M-11). The file is fetched with a short-lived
// signed token from GET /api/documents/<id>/download-token/ (requested through
// the axios client, so an expired access token goes through the normal refresh
// path). The response is accepted only when it is a 2xx with a file content
// type; an API error body is never handed to the user as their document.
// No React Native imports here, so the logic runs under Node in the harness.

export const DOWNLOAD_ERROR_MESSAGES = {
  forbidden: 'لا تملك صلاحية تنزيل هذا الملف أو انتهت صلاحية رابط التنزيل.',
  notFound: 'الملف غير متاح حالياً.',
  server: 'حدث خطأ في الخادم أثناء تنزيل الملف. حاول مرة أخرى بعد قليل.',
  invalid: 'وصلت استجابة غير صالحة بدلاً من الملف. حاول مرة أخرى.',
  generic: 'تعذر تنزيل الملف. تحقق من اتصالك ثم حاول مرة أخرى.',
};

export class DownloadError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'DownloadError';
    this.status = status;
  }
}

const MAX_FILENAME_LENGTH = 120;

/**
 * A file name that is safe inside the cache directory: no path separators,
 * no parent references, no control or reserved characters, bounded length,
 * extension kept.
 */
export function sanitizeFilename(name: string | null | undefined, fallback = 'document') {
  let value = String(name ?? '');
  // Keep only the last path segment, whatever separator was used.
  value = value.split(/[\\/]/).pop() ?? '';
  value = value
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[<>:"|?*%#&{}$!'`=+@^~;]/g, '_')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+/, '')
    .trim();
  if (!value || /^\.+$/.test(value)) value = fallback;
  if (value.length > MAX_FILENAME_LENGTH) {
    const dot = value.lastIndexOf('.');
    const extension = dot > 0 && value.length - dot <= 10 ? value.slice(dot) : '';
    value = value.slice(0, MAX_FILENAME_LENGTH - extension.length) + extension;
  }
  return value;
}

export function buildTokenDownloadUrl(apiBaseUrl: string, documentId: number | string, token: string) {
  const base = apiBaseUrl.replace(/\/+$/, '');
  return `${base}/documents/${encodeURIComponent(String(documentId))}/download/?token=${encodeURIComponent(token)}`;
}

function headerValue(headers: Record<string, string> | undefined, name: string) {
  if (!headers) return '';
  const key = Object.keys(headers).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
  return key ? String(headers[key] ?? '') : '';
}

/** Null when the response is a usable file, else the Arabic reason. */
export function downloadResponseError(status: number, headers?: Record<string, string>) {
  if (status === 401 || status === 403) return DOWNLOAD_ERROR_MESSAGES.forbidden;
  if (status === 404) return DOWNLOAD_ERROR_MESSAGES.notFound;
  if (status >= 500) return DOWNLOAD_ERROR_MESSAGES.server;
  if (status < 200 || status >= 300) return DOWNLOAD_ERROR_MESSAGES.generic;
  // Documents are PDF, images or Word files; a JSON or HTML body is an error page.
  const contentType = headerValue(headers, 'content-type').toLowerCase();
  if (contentType.includes('application/json') || contentType.includes('text/html')) {
    return DOWNLOAD_ERROR_MESSAGES.invalid;
  }
  return null;
}

export interface DownloadAttemptResult {
  status: number;
  headers?: Record<string, string>;
  uri: string;
}

export interface TokenDownloadDeps {
  apiBaseUrl: string;
  documentId: number | string;
  filename?: string | null;
  targetDirectory: string;
  getToken: (documentId: number | string) => Promise<{ token: string }>;
  download: (url: string, target: string) => Promise<DownloadAttemptResult>;
  discard: (uri: string) => Promise<void>;
}

/**
 * Downloads the document to `targetDirectory` and returns the local URI. A
 * 401/403/404 on the first attempt (the token can expire between issue and
 * use) is retried once with a fresh token. Throws DownloadError with an Arabic
 * message on failure, after deleting whatever was written.
 */
export async function downloadDocumentWithToken(deps: TokenDownloadDeps) {
  const safeName = sanitizeFilename(deps.filename, `document-${deps.documentId}`);
  const target = `${deps.targetDirectory}${sanitizeFilename(String(deps.documentId), 'id')}-${safeName}`;

  let lastError: DownloadError | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { token } = await deps.getToken(deps.documentId);
    if (!token) throw new DownloadError(DOWNLOAD_ERROR_MESSAGES.generic);
    const result = await deps.download(buildTokenDownloadUrl(deps.apiBaseUrl, deps.documentId, token), target);
    const error = downloadResponseError(result.status, result.headers);
    if (!error) return result.uri;
    await deps.discard(result.uri).catch(() => undefined);
    lastError = new DownloadError(error, result.status);
    if (![401, 403, 404].includes(result.status)) break;
  }
  throw lastError ?? new DownloadError(DOWNLOAD_ERROR_MESSAGES.generic);
}
