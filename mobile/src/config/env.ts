const trimSlash = (value: string) => value.replace(/\/+$/, '');

const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000';
const normalizedBaseUrl = trimSlash(rawBaseUrl);

export const env = {
  apiBaseUrl: normalizedBaseUrl.endsWith('/api')
    ? normalizedBaseUrl
    : `${normalizedBaseUrl}/api`,
  appName: 'Khalsni Mobile',
};

export type AppEnv = typeof env;
