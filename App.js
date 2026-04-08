import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { GoogleSignin, googleSignInAvailable } from './src/lib/googleSignIn';
import {
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins';
import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ToastProvider } from './src/components/Toast';
import { OfflineBanner } from './src/components/OfflineBanner';
import { ThemeProvider } from './src/theme/ThemeContext';
import { useTheme } from './src/theme';
import { AuthProvider } from './src/contexts/AuthContext';
import { useColorScheme } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/lib/queryClient';

const AppInner = () => {
  const { colors, scheme: resolvedTheme } = useTheme();

  // Android Navigation Bar — цвет привязан к теме приложения
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const isLight = resolvedTheme === 'light';
    (async () => {
      try {
        await NavigationBar.setBackgroundColorAsync(colors.background);
        await NavigationBar.setButtonStyleAsync(isLight ? 'dark' : 'light');
      } catch {
        // игнорируем, если платформа не поддерживает
      }
    })();
  }, [colors.background, resolvedTheme]);

  return (
    <>
      <StatusBar style={resolvedTheme === 'light' ? 'dark' : 'light'} />
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}
      >
        <AuthProvider>
          <ToastProvider>
            <OfflineBanner />
            <RootNavigator />
          </ToastProvider>
        </AuthProvider>
      </View>
    </>
  );
};

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';

export default function App() {
  const scheme = useColorScheme();
  useEffect(() => {
    if (googleSignInAvailable && GoogleSignin && GOOGLE_WEB_CLIENT_ID) {
      GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
      });
    }

    // НЕ запрашиваем уведомления при старте — это плохой UX.
    // Разрешения запрашиваются при первом действии пользователя (тренировка, профиль).
  }, []);

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  if (!fontsLoaded) {
    // Используем те же цвета что и в app.json splash (#020617) для плавного перехода
    return (
      <View style={{ flex: 1, backgroundColor: '#020617', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#38BDF8" size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <AppInner />
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
