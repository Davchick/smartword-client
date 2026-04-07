import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, NavigationContainerRef, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { SignInScreen } from '../screens/Auth/SignInScreen';
import { WelcomeScreen } from '../screens/Auth/WelcomeScreen';
import { TabNavigator } from './TabNavigator';
import { ProfileSettingsScreen } from '../screens/Profile/ProfileSettingsScreen';
import { AchievementsScreen } from '../screens/Profile/AchievementsScreen';
import { PaymentScreen } from '../screens/Billing/PaymentScreen';
import { useTheme } from '../theme';
import { ErrorBoundary } from '../components/ErrorBoundary';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { colors, isDark } = useTheme();
  const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const { user, loading: authLoading } = useAuth();
  const [hasSeenWelcome, setHasSeenWelcome] = useState<boolean | null>(null); // null = ещё не загружено
  const hadUserRef = useRef(false);
  const navReadyRef = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem('smartword_has_seen_welcome')
      .then((seen) => {
        setHasSeenWelcome(seen === '1');
      })
      .catch((err) => {
        // Не блокируем приложение при сбое AsyncStorage
        console.warn('[RootNavigator] Failed to read has_seen_welcome:', err);
        setHasSeenWelcome(true); // Fallback — показываем Main
      });
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (hasSeenWelcome === null) return; // Ждём загрузки
    if (!navReadyRef.current) return; // Ждём готовности NavigationContainer
    if (user) {
      hadUserRef.current = true;
      AsyncStorage.removeItem('smartword_guest_mode');
      navRef.current?.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } else if (hadUserRef.current) {
      hadUserRef.current = false;
      navRef.current?.reset({
        index: 0,
        routes: [{ name: 'SignIn' }],
      });
    }
  }, [authLoading, user, hasSeenWelcome]);

  const initialRoute: keyof RootStackParamList = hasSeenWelcome === null
    ? 'Welcome' // Fallback — не должен произойти т.к. мы выше return при null
    : user
      ? 'Main'
      : hasSeenWelcome
        ? 'SignIn'
        : 'Welcome';

  const navigationTheme = useMemo(() => ({
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.card,
      border: colors.border,
      primary: colors.primary,
      text: colors.text,
    },
  }), [isDark, colors.background, colors.card, colors.border, colors.primary, colors.text]);

  // Показываем загрузку пока не прочитали AsyncStorage или authLoading
  if (authLoading || hasSeenWelcome === null) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <NavigationContainer ref={navRef} theme={navigationTheme} onReady={() => { navReadyRef.current = true; }}>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{ headerShown: false, animation: 'fade' }}
        >
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen name="ProfileSettings" component={ProfileSettingsScreen} />
          <Stack.Screen name="Achievements" component={AchievementsScreen} />
          <Stack.Screen name="BillingPayment" component={PaymentScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
};
