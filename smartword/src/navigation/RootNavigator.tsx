import React, { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { SignInScreen } from '../screens/Auth/SignInScreen';
import { WelcomeScreen } from '../screens/Auth/WelcomeScreen';
import { TabNavigator } from './TabNavigator';
import { ProfileSettingsScreen } from '../screens/Profile/ProfileSettingsScreen';
import { useTheme } from '../theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { colors } = useTheme();
  const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);

  useEffect(() => {
    const init = async () => {
      const [{ data }, seen] = await Promise.all([
        supabase.auth.getSession(),
        AsyncStorage.getItem('smartword_has_seen_welcome'),
      ]);

      setSession(data.session ?? null);
      setHasSeenWelcome(seen === '1');
      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);

      if (event === 'SIGNED_IN' && newSession) {
        // Сбрасываем гостевой режим
        await AsyncStorage.removeItem('smartword_guest_mode');
        // Принудительно переходим на Main и сбрасываем стек
        navRef.current?.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      }

      if (event === 'SIGNED_OUT') {
        navRef.current?.reset({
          index: 0,
          routes: [{ name: 'Welcome' }],
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  // Определяем начальный экран
  const initialRoute: keyof RootStackParamList = session
    ? 'Main'
    : hasSeenWelcome
    ? 'Main'   // гостевой режим — тоже Main
    : 'Welcome';

  return (
    <NavigationContainer ref={navRef}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false, animation: 'fade' }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="SignIn" component={SignInScreen} />
        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen name="ProfileSettings" component={ProfileSettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
