import 'react-native-gesture-handler';
import 'react-native-reanimated';

import { Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold, Cairo_800ExtraBold } from '@expo-google-fonts/cairo';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';

import { AuthProvider } from './src/auth/AuthProvider';
import { env } from './src/config/env';
import { RootNavigator } from './src/navigation/RootNavigator';
import { queryClient } from './src/services/queryClient';
import { theme } from './src/theme';

export default function App() {
  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Cairo_800ExtraBold,
  });

  // A production bundle without a real HTTPS API URL must not start: there is
  // no backend to sign in to, and requests must never go to a placeholder host.
  if (env.configError) {
    return (
      <View style={styles.configError}>
        <Text style={styles.configErrorTitle}>التطبيق غير مهيأ للتشغيل</Text>
        <Text style={styles.configErrorText}>
          لم يتم ضبط عنوان الخادم لهذا الإصدار من التطبيق. يرجى تثبيت النسخة الرسمية أو التواصل مع الدعم.
        </Text>
      </View>
    );
  }

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RootNavigator />
            <StatusBar style="dark" />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  configError: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
    backgroundColor: theme.colors.background,
  },
  configErrorTitle: {
    color: theme.colors.danger,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  configErrorText: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
  },
});
