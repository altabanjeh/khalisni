// The API base URL comes only from build configuration (EXPO_PUBLIC_API_BASE_URL,
// inlined by Expo at bundle time). Nothing in the repository names a production
// host. A development bundle may fall back to a local server; a production
// bundle never does: a missing, non-HTTPS or placeholder URL is a configuration
// error that App.tsx shows on a blocking screen instead of sending requests.
// See mobile/README.md, section "API base URL".

const DEVELOPMENT_DEFAULT_URL = 'http://127.0.0.1:8000';

// Hosts that are never a real production backend.
const PLACEHOLDER_HOST_PATTERNS: RegExp[] = [
  /(^|\.)example\.(com|org|net)$/i,
  /\.(example|test|invalid|localhost|local)$/i,
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^\[?::1\]?$/,
  /^10\.0\.2\.2$/,
];

const trimSlash = (value: string) => value.replace(/\/+$/, '');

function readHost(url: string) {
  const match = /^[a-z][a-z0-9+.-]*:\/\/(?:[^@/?#]*@)?(\[[^\]]+\]|[^:/?#]+)/i.exec(url);
  return match ? match[1].toLowerCase() : '';
}

export function isPlaceholderApiUrl(url: string) {
  const host = readHost(url);
  if (!host) return true;
  return PLACEHOLDER_HOST_PATTERNS.some((pattern) => pattern.test(host));
}

/**
 * Returns the error that makes `rawUrl` unusable for a production build, or
 * null when it is a real HTTPS URL. Exported for the build-time check in
 * app.config.js and for tests.
 */
export function productionApiUrlError(rawUrl: string | undefined | null) {
  const value = String(rawUrl ?? '').trim();
  if (!value) return 'EXPO_PUBLIC_API_BASE_URL is not set.';
  if (!/^https:\/\//i.test(value)) return `EXPO_PUBLIC_API_BASE_URL must use https:// (got "${value}").`;
  if (isPlaceholderApiUrl(value)) return `EXPO_PUBLIC_API_BASE_URL is a placeholder or local address ("${value}").`;
  return null;
}

function detectProduction() {
  // __DEV__ is the React Native bundle flag; outside React Native (tests)
  // fall back to NODE_ENV.
  const devFlag = (globalThis as { __DEV__?: boolean }).__DEV__;
  if (typeof devFlag === 'boolean') return !devFlag;
  return process.env.NODE_ENV === 'production';
}

export function resolveApiConfig(rawUrl: string | undefined | null, isProduction: boolean) {
  const configured = String(rawUrl ?? '').trim();
  if (isProduction) {
    const error = productionApiUrlError(configured);
    if (error) {
      // No usable base URL: requests cannot reach a placeholder host.
      return { apiBaseUrl: '', configError: error };
    }
  }
  const normalized = trimSlash(configured || DEVELOPMENT_DEFAULT_URL);
  return {
    apiBaseUrl: normalized.endsWith('/api') ? normalized : `${normalized}/api`,
    configError: null as string | null,
  };
}

const isProduction = detectProduction();
const resolved = resolveApiConfig(process.env.EXPO_PUBLIC_API_BASE_URL, isProduction);

export const env = {
  apiBaseUrl: resolved.apiBaseUrl,
  // Non-null only in a production bundle built without a valid HTTPS API URL.
  configError: resolved.configError,
  isProduction,
  appName: 'Khalsni Mobile',
};

export type AppEnv = typeof env;
