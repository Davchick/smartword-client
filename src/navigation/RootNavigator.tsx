import React, { useEffect, useRef, useMemo } from "react";
import { View, ActivityIndicator } from "react-native";
import {
  NavigationContainer,
  NavigationContainerRef,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../contexts/AuthContext";
import { SignInScreen } from "../screens/Auth/SignInScreen";
import { WelcomeScreen } from "../screens/Auth/WelcomeScreen";
import { TabNavigator } from "./TabNavigator";
import { ProfileSettingsScreen } from "../screens/Profile/ProfileSettingsScreen";
import { ProfileAccountScreen } from "../screens/Profile/ProfileAccountScreen";
import { PaymentScreen } from "../screens/Billing/PaymentScreen";
import { PremiumThankYouScreen } from "../screens/Billing/PremiumThankYouScreen";

import { useTheme } from "../theme";
import { ErrorBoundary } from "../components/ErrorBoundary";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { colors, isDark } = useTheme();
  const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const { user, loading: authLoading, guestMode } = useAuth();
  const navReadyRef = useRef(false);

  // Логика определения начального экрана:
  // 1. guestMode === true (выбрал "Начать без аккаунта") → Main
  // 2. user !== null (авторизован) → Main
  // 3. guestMode === false && user === null → Welcome (показываем выбор)
  // 4. loading === true → загрузка

  const initialRoute = useMemo<keyof RootStackParamList>(() => {
    if (authLoading) return "Welcome"; // fallback, реально покажем loader
    if (guestMode) return "Main";
    if (user) return "Main";
    return "Welcome";
  }, [authLoading, guestMode, user]);

  const navigationTheme = useMemo(
    () => ({
      ...(isDark ? DarkTheme : DefaultTheme),
      colors: {
        ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
        background: colors.background,
        card: colors.card,
        border: colors.border,
        primary: colors.primary,
        text: colors.text,
      },
    }),
    [
      isDark,
      colors.background,
      colors.card,
      colors.border,
      colors.primary,
      colors.text,
    ],
  );

  // При выходе из аккаунта (user стал null, но не guestMode) → показываем Welcome
  useEffect(() => {
    if (!navReadyRef.current || authLoading) return;

    const targetRoute: keyof RootStackParamList = guestMode || user ? "Main" : "Welcome";
    const currentRoute = navRef.current?.getCurrentRoute()?.name;

    // Prevent stale auth navigation state: always align root route with auth state.
    if (currentRoute !== targetRoute) {
      navRef.current?.reset({
        index: 0,
        routes: [{ name: targetRoute }],
      });
    }
  }, [user, authLoading, guestMode]);

  // Показываем загрузку пока auth не определился
  if (authLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <NavigationContainer
        ref={navRef}
        theme={navigationTheme}
        onReady={() => {
          navReadyRef.current = true;
        }}
      >
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{ headerShown: false, animation: "fade" }}
        >
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen
            name="ProfileSettings"
            component={ProfileSettingsScreen}
          />
          <Stack.Screen
            name="ProfileAccount"
            component={ProfileAccountScreen}
          />
          <Stack.Screen name="BillingPayment" component={PaymentScreen} />
          <Stack.Screen name="PremiumThankYou" component={PremiumThankYouScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
};
