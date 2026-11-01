import { I18nManager } from 'react-native';
import { registerRootComponent } from 'expo';

import App from './App';

// RTL policy (README "RTL policy", audit M-27): Arabic is laid out explicitly
// (row-reverse, textAlign: 'right') inside a native LTR layout, so native RTL
// mirroring is kept off on every device. Android is locked from the first
// launch by plugins/withLtrLayoutLock.js (android:supportsRtl="false"); these
// calls persist the same choice for React Native on both platforms.
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
