import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { APP_LANGUAGE } from '../api/client';
import { documentsApi } from '../api/documents.api';
import { env } from '../config/env';
import type { UploadableDocument } from '../types/document';
import { DOWNLOAD_ERROR_MESSAGES, DownloadError, downloadDocumentWithToken } from './download';
import { validateUploadableFile } from './serviceForms';

/**
 * Generic upload check (backend global rules: .pdf .jpg .jpeg .png .doc .docx,
 * 10 MB). Screens that know the requirement pass it to validateUploadableFile
 * instead, which applies that requirement's own extensions and size.
 */
export function validateUploadDocument(file: UploadableDocument) {
  return validateUploadableFile(file, null);
}

const DOWNLOAD_DIRECTORY = `${FileSystem.cacheDirectory}downloads/`;

/**
 * Downloads a document with a short-lived token and opens the share sheet.
 * Throws an Error with an Arabic message instead of sharing an error body.
 */
export async function downloadAndShareDocument(document: { id: number; original_filename?: string | null }) {
  await FileSystem.makeDirectoryAsync(DOWNLOAD_DIRECTORY, { intermediates: true }).catch(() => undefined);
  let uri: string;
  try {
    uri = await downloadDocumentWithToken({
      apiBaseUrl: env.apiBaseUrl,
      documentId: document.id,
      filename: document.original_filename,
      targetDirectory: DOWNLOAD_DIRECTORY,
      getToken: (documentId) => documentsApi.getDownloadToken(documentId),
      download: async (url, target) => {
        const result = await FileSystem.downloadAsync(url, target, {
          headers: { 'Accept-Language': APP_LANGUAGE },
        });
        return { status: result.status, headers: result.headers, uri: result.uri };
      },
      discard: (fileUri) => FileSystem.deleteAsync(fileUri, { idempotent: true }),
    });
  } catch (error) {
    if (error instanceof DownloadError) throw error;
    // Token request failures are already normalized (Arabic) by the API client.
    const message = (error as { message?: unknown } | null)?.message;
    throw new Error(typeof message === 'string' && message ? message : DOWNLOAD_ERROR_MESSAGES.generic);
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri);
  }
  return uri;
}
