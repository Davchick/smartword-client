import React, { useEffect, useRef, useState } from 'react';
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
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { colors, isDark } = useTheme();
  const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const { user, loading: authLoading } = useAuth();
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);
  const hadUserRef = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem('smartword_has_seen_welcome').then((seen) => {
      setHasSeenWelcome(seen === '1');
    });
  }, []);

  useEffect(() => {
    if (authLoading) return;
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
        routes: [{ name: 'Welcome' }],
      });
    }
  }, [authLoading, user]);

  if (authLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const initialRoute: keyof RootStackParamList = user
    ? 'Main'
    : hasSeenWelcome
      ? 'Main'
      : 'Welcome';

  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.card,
      border: colors.border,
      primary: colors.primary,
      text: colors.text,
    },
  };

  return (
    <NavigationContainer ref={navRef} theme={navigationTheme}>
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
  );
};
