// Build-time guard for the API base URL (see README.md, "API base URL").
// app.json stays the source of the static Expo config; this file only refuses
// to produce a store or internal build that would talk to no real backend.
// The same rule is enforced again at runtime by src/config/env.ts.

const PLACEHOLDER_HOST_PATTERNS = [
  /(^|\.)example\.(com|org|net)$/i,
  /\.(example|test|invalid|localhost|local)$/i,
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^\[?::1\]?$/,
  /^10\.0\.2\.2$/,
];

function readHost(url) {
  const match = /^[a-z][a-z0-9+.-]*:\/\/(?:[^@/?#]*@)?(\[[^\]]+\]|[^:/?#]+)/i.exec(url);
  return match ? match[1].toLowerCase() : '';
}

function productionApiUrlError(rawUrl) {
  const value = String(rawUrl || '').trim();
  if (!value) return 'EXPO_PUBLIC_API_BASE_URL is not set.';
  if (!/^https:\/\//i.test(value)) return `EXPO_PUBLIC_API_BASE_URL must use https:// (got "${value}").`;
  const host = readHost(value);
  if (!host || PLACEHOLDER_HOST_PATTERNS.some((pattern) => pattern.test(host))) {
    return `EXPO_PUBLIC_API_BASE_URL is a placeholder or local address ("${value}").`;
  }
  return null;
}

module.exports = ({ config }) => {
  // EAS sets EAS_BUILD_PROFILE on its build workers. Every profile except
  // "development" produces an app installed on real devices, so it needs the
  // real HTTPS API host.
  const profile = process.env.EAS_BUILD_PROFILE;
  if (profile && profile !== 'development') {
    const error = productionApiUrlError(process.env.EXPO_PUBLIC_API_BASE_URL);
    if (error) {
      throw new Error(
        `[khalsni] Refusing to build profile "${profile}": ${error} `
          + 'Set EXPO_PUBLIC_API_BASE_URL to the real https:// API host as an EAS environment variable '
          + '(see mobile/README.md, "API base URL").',
      );
    }
  }
  return config;
};
