import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import type { UploadableDocument } from '../types/document';

const supportedMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
];

export const maxUploadSizeBytes = 10 * 1024 * 1024;

export function validateUploadDocument(file: UploadableDocument) {
  if (file.size && file.size > maxUploadSizeBytes) {
    return 'الملف أكبر من 10 ميغابايت.';
  }

  if (file.mimeType && !supportedMimeTypes.includes(file.mimeType)) {
    return 'نوع الملف غير مدعوم. استخدم PDF أو صورة.';
  }

  return null;
}

export async function downloadAndShareDocument(url: string, filename: string, accessToken?: string | null) {
  const target = `${FileSystem.cacheDirectory}${filename}`;
  const result = await FileSystem.downloadAsync(url, target, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri);
  }
  return result.uri;
}
