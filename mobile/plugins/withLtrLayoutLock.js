// RTL policy (audit M-27; see README "RTL policy"): the app is Arabic only and
// lays Arabic out explicitly inside a native LTR layout (row-reverse rows,
// textAlign: 'right', the label last in KeyValueRow). Native RTL mirroring
// would flip every one of those, so it is switched off on every device:
//
// * Android: React Native mirrors only when the application declares
//   android:supportsRtl="true" (I18nUtil.applicationHasRtlSupport) and the
//   device locale is RTL. This plugin writes supportsRtl="false" into the
//   generated AndroidManifest, which takes effect from the first launch.
// * iOS: the bundle has no Arabic localization, so isRTL is false; index.ts
//   additionally calls I18nManager.allowRTL(false) / forceRTL(false).
const { withAndroidManifest } = require('expo/config-plugins');

function lockApplicationLtr(androidManifest) {
  const application = androidManifest?.manifest?.application?.[0];
  if (application) {
    application.$ = { ...(application.$ || {}), 'android:supportsRtl': 'false' };
  }
  return androidManifest;
}

function withLtrLayoutLock(config) {
  return withAndroidManifest(config, (modConfig) => {
    modConfig.modResults = lockApplicationLtr(modConfig.modResults);
    return modConfig;
  });
}

module.exports = withLtrLayoutLock;
module.exports.lockApplicationLtr = lockApplicationLtr;
