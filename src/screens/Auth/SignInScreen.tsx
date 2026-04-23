import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Animated,
  Linking,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Eye, EyeOff, Mail, Lock } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiPost, setTokens, getBaseUrl } from '../../lib/api';
import { GoogleSignin, googleSignInAvailable } from '../../lib/googleSignIn';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import { useTheme, fonts } from '../../theme';
import { importGuestDataIfNeeded } from '../../lib/guestImport';
import type { RootStackParamList } from '../../navigation/types';
import { Image } from 'react-native';
import { useDeviceSize } from '../../hooks/useDeviceSize';
import { useResponsiveTypography } from '../../hooks/useResponsiveTypography';
import { moderateScale } from '../../utils/responsive';

/** Ник по умолчанию: часть email до @ (makar@gmail.com → makar) */
const nicknameFromEmail = (email: string) => {
  const part = email?.trim().split('@')[0] || '';
  return part || `user${Math.floor(100 + Math.random() * 900)}`;
};

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'>;

/**
 * Responsive styles для SignInScreen
 * Автоматически масштабируются под размер экрана
 */
const useSignInStyles = () => {
  const { isSmall, isMedium, isLarge, spacing, typography, radii } = useDeviceSize();

  return {
    ...StyleSheet.create({
      container: { flex: 1 },
      scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.lg },
      content: { justifyContent: 'center' },

      // Header
      header: { alignItems: 'center', marginBottom: spacing.xl },
      title: {},
      subtitle: {},

      // Form
      form: { gap: spacing.md },

      // Inputs
      inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xs,
      },
      inputIcon: {
        marginRight: spacing.sm,
      },
      input: {
        flex: 1,
        fontFamily: fonts.regular,
        paddingVertical: 0,
        paddingHorizontal: 0,
        height: isSmall ? 32 : 36,
        fontSize: typography.body,
      },

      // Links
      forgotLink: {
        alignSelf: 'flex-end',
        marginTop: -spacing.xs,
      },

      // Buttons
      submitBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radii.md,
        paddingVertical: spacing.md,
        marginTop: spacing.sm,
      },

      // Google button
      googleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        borderRadius: radii.md,
        borderWidth: 1,
        paddingVertical: spacing.md - 2,
      },
      googleIconWrap: {
        width: spacing.lg,
        height: spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 4,
      },

      // Agreement
      agreementBlock: {
        marginTop: spacing.xs,
      },
      agreementRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
      },
      checkboxSquare: {
        width: isSmall ? 16 : 18,
        height: isSmall ? 16 : 18,
        borderRadius: 5,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginTop: 2,
      },
      checkmark: {
        fontSize: isSmall ? 10 : 12,
        color: '#FFFFFF',
        fontWeight: 'bold',
        lineHeight: isSmall ? 10 : 12,
      },
      agreementText: {
        flex: 1,
        fontFamily: fonts.regular,
        lineHeight: 18,
      },
      linkText: {
        fontFamily: fonts.bold,
      },

      // Resend
      resendBtn: {
        alignItems: 'center',
        paddingVertical: spacing.sm,
      },

      // Toggle
      toggleBtn: {
        alignItems: 'center',
        paddingVertical: spacing.md,
      },

      // Forgot password
      forgotActions: {
        gap: spacing.sm,
        marginTop: spacing.lg,
      },
      forgotBackBtn: {
        borderRadius: radii.md,
        borderWidth: 1,
        paddingVertical: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
      },
      forgotSubmitBtn: {
        borderRadius: radii.md,
        paddingVertical: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
      },
    }),
    // Back button
    backBtn: {
      position: 'absolute' as const,
      zIndex: 10,
      width: isSmall ? 32 : 36,
      height: isSmall ? 32 : 36,
      borderRadius: isSmall ? 16 : 18,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    // Submit button text
    submitBtnText: {
      fontSize: typography.body,
      fontFamily: fonts.bold,
      color: '#FFFFFF',
    },
    // Google button text
    googleBtnText: {
      fontSize: typography.body,
      fontFamily: fonts.medium,
    },
    // Forgot link text
    forgotLinkText: {
      fontSize: typography.small,
      fontFamily: fonts.medium,
    },
    // Forgot back text
    forgotBackText: {
      fontSize: typography.small,
      fontFamily: fonts.medium,
    },
    // Forgot submit text
    forgotSubmitText: {
      fontSize: typography.body,
      fontFamily: fonts.bold,
      color: '#FFFFFF',
    },
    // Resend text
    resendText: {
      fontSize: typography.small,
      fontFamily: fonts.medium,
    },
    // Toggle text
    toggleText: {
      fontSize: typography.small,
      fontFamily: fonts.regular,
    },
    toggleLinkText: {
      fontFamily: fonts.bold,
    },
    // Spacing access
    spacing,
  };
};

// Google логотип (PNG из assets)
const GoogleIcon = () => {
  const iconSize = moderateScale(20);
  return (
    <Image
      source={require('../../../assets/google.png')}
      style={{ width: iconSize, height: iconSize }}
      resizeMode="contain"
    />
  );
};

export const SignInScreen = ({ route, navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const { setUser, setHasAccount, setGuestMode } = useAuth();
  const fromProfile = route.params?.fromProfile ?? false;

  // Responsive hooks
  const styles = useSignInStyles();
  const typography = useResponsiveTypography();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [emailNotVerifiedShown, setEmailNotVerifiedShown] = useState(false);
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [personalDataConsentChecked, setPersonalDataConsentChecked] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Анимации
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const animatingRef = useRef(false);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  useEffect(() => {
    animatingRef.current = true;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 100, friction: 14 }),
    ]).start(() => {
      animatingRef.current = false;
    });
    return () => {
      fadeAnim.stopAnimation();
      slideAnim.stopAnimation();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAuth = async () => {
    Keyboard.dismiss();
    if (!email.trim() || !password.trim()) {
      showToast('Введите email и пароль', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('Пароль минимум 6 символов', 'error');
      return;
    }
    if (isSignUp && (!agreementChecked || !personalDataConsentChecked)) {
      showToast('Примите все обязательные согласия', 'error');
      return;
    }

    setEmailNotVerifiedShown(false);
    setLoading(true);
    try {
      const path = isSignUp ? '/auth/register' : '/auth/login';
      const data = await apiPost<{
        message?: string;
        email?: string;
        access_token?: string;
        refresh_token?: string;
        user?: { id: string; email: string; is_premium: boolean; ai_messages_used: number };
      }>(path, { email: email.trim(), password });

      if (isSignUp && data.message && !data.access_token) {
        showToast(data.message, 'success');
        return;
      }

      if (data.access_token && data.refresh_token && data.user) {
        await setTokens(data.access_token, data.refresh_token);
        setUser({
          id: data.user.id,
          email: data.user.email,
          is_premium: data.user.is_premium,
          ai_messages_used: data.user.ai_messages_used,
          created_at: new Date().toISOString(),
        });
        await setHasAccount(true);
        await setGuestMode(false);
        const existing = await AsyncStorage.getItem('smartword_nickname');
        if (!existing?.trim()) {
          await AsyncStorage.setItem('smartword_nickname', nicknameFromEmail(data.user.email));
        }
        await importGuestDataIfNeeded(data.user.id);
        showToast('Добро пожаловать!', 'success');
      }
    } catch (err: unknown) {
      const e = err as { message?: string; name?: string; status?: number; body?: { error?: string; code?: string } };
      let msg = e?.body?.error;
      if (e?.body?.code === 'EMAIL_NOT_VERIFIED') setEmailNotVerifiedShown(true);
      if (e?.status === 401 || /invalid.*(email|password|pass|login)/i.test(String(msg || ''))) {
        msg = 'Неверный email или пароль';
      }
      if (!msg && (e?.message === 'EXPO_PUBLIC_API_URL is not set' || !getBaseUrl()))
        msg = 'В .env укажите EXPO_PUBLIC_API_URL. На устройстве используйте IP ПК (например http://192.168.1.x:3000), не localhost.';
      if (!msg && (e?.name === 'TypeError' || /network|fetch|failed|could not connect/i.test(String(e?.message))))
        msg = 'Не удаётся подключиться к серверу. Запустите бэкенд и в .env приложения укажите EXPO_PUBLIC_API_URL с IP вашего ПК (не localhost).';
      if (!msg && e?.message?.includes('timeout'))
        msg = 'Превышено время ожидания ответа от сервера. Проверьте интернет и попробуйте снова.';
      if (!msg && e?.status === 502)
        msg = 'Сервер временно недоступн. Попробуйте позже.';
      if (!msg && e?.status === 503)
        msg = 'Сервер перегружен. Попробуйте позже.';
      if (!msg) msg = 'Ошибка входа. Попробуйте позже.';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      showToast('Введите email', 'error');
      return;
    }
    setForgotLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const data = await apiPost<{ message?: string }>('/auth/forgot-password', { email: email.trim() }, {
        skipAuth: true,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      showToast(data?.message || 'Письмо отправлено. Проверьте почту.', 'success');
      setShowForgotPassword(false);
    } catch (err: unknown) {
      const e = err as { body?: { error?: string }; message?: string; name?: string };
      if (e?.name === 'AbortError' || e?.message?.includes('abort')) {
        showToast('Превышено время ожидания. Проверьте интернет и попробуйте снова.', 'error');
      } else {
        showToast(e?.body?.error || 'Ошибка. Попробуйте позже.', 'error');
      }
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) {
      showToast('Введите email', 'error');
      return;
    }
    setResendLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      await apiPost<{ message?: string }>('/auth/resend-verification', { email: email.trim() }, {
        skipAuth: true,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      showToast('Письмо отправлено повторно. Проверьте почту.', 'success');
      setEmailNotVerifiedShown(false);
    } catch (err: unknown) {
      const e = err as { body?: { error?: string }; message?: string; name?: string };
      if (e?.name === 'AbortError' || e?.message?.includes('abort')) {
        showToast('Превышено время ожидания. Проверьте интернет и попробуйте снова.', 'error');
      } else {
        showToast(e?.body?.error || 'Ошибка. Попробуйте позже.', 'error');
      }
    } finally {
      setResendLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!googleSignInAvailable || !GoogleSignin) {
      showToast('Вход через Google доступен только в сборке приложения (npx expo run:android). В Expo Go используйте email и пароль.', 'error');
      return;
    }
    if (!getBaseUrl()) {
      showToast('Настройте EXPO_PUBLIC_API_URL в .env', 'error');
      return;
    }
    if (!process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID) {
      showToast('Настройте EXPO_PUBLIC_GOOGLE_CLIENT_ID в .env для входа через Google', 'error');
      return;
    }
    setGoogleLoading(true);
    try {
      if (Platform.OS === 'android') {
        const hasPlayServices = await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        if (!hasPlayServices) {
          showToast('Установите Google Play Services', 'error');
          return;
        }
      }
      const result = await GoogleSignin.signIn();
      if (result.type === 'cancelled') {
        return;
      }
      if (result.type !== 'success') {
        showToast('Вход через Google отменён', 'error');
        return;
      }
      let idToken = result.data.idToken;
      if (!idToken) {
        const tokens = await GoogleSignin.getTokens();
        idToken = tokens.idToken;
      }
      if (!idToken) {
        showToast('Не удалось получить токен. Проверьте EXPO_PUBLIC_GOOGLE_CLIENT_ID (Web client ID).', 'error');
        return;
      }
      const data = await apiPost<{
        access_token?: string;
        refresh_token?: string;
        user?: { id: string; email: string; is_premium: boolean; ai_messages_used: number };
      }>('/auth/google', { id_token: idToken }, { skipAuth: true });
      if (data.access_token && data.refresh_token && data.user) {
        await setTokens(data.access_token, data.refresh_token);
        setUser({
          id: data.user.id,
          email: data.user.email,
          is_premium: data.user.is_premium,
          ai_messages_used: data.user.ai_messages_used,
          created_at: new Date().toISOString(),
        });
        await setHasAccount(true);
        await setGuestMode(false);
        const existing = await AsyncStorage.getItem('smartword_nickname');
        if (!existing?.trim()) {
          await AsyncStorage.setItem('smartword_nickname', nicknameFromEmail(data.user.email));
        }
        await importGuestDataIfNeeded(data.user.id);
        showToast('Добро пожаловать!', 'success');
      }
    } catch (err: unknown) {
      const e = err as { message?: string; code?: string; body?: { error?: string } };
      let msg = e?.body?.error;
      if (!msg && e?.message) {
        if (/NativeModule|RNGoogleSignin|not found/i.test(e.message)) {
          msg = 'Вход через Google требует сборку приложения (npx expo run:android). Expo Go не поддерживается.';
        } else {
          msg = e.message;
        }
      }
      if (!msg) msg = 'Ошибка входа через Google. Попробуйте позже.';
      showToast(msg, 'error');
    } finally {
      setGoogleLoading(false);
    }
  };

  const inputBorder = useCallback((focused: boolean) => ({
    borderBottomWidth: focused ? 2 : 1,
    borderBottomColor: focused ? colors.primary : isDark ? 'rgba(148,163,184,0.3)' : 'rgba(148,163,184,0.4)',
  }), [colors.primary, isDark]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top}
    >
      <TouchableOpacity
          style={[styles.backBtn, { top: insets.top + styles.spacing.md, left: styles.spacing.md, backgroundColor: isDark ? 'rgba(30,41,59,0.8)' : 'rgba(255,255,255,0.8)' }]}
          onPress={() => fromProfile ? navigation.goBack() : navigation.navigate('Welcome')}
          activeOpacity={0.6}
        >
          <ArrowLeft color={colors.text} size={styles.spacing.md} strokeWidth={2} />
        </TouchableOpacity>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 80, paddingBottom: insets.bottom + styles.spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View
          style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          {/* Заголовок */}
          <View style={styles.header}>
            <Text style={[styles.title, { fontSize: typography.title, lineHeight: typography.titleLineHeight, color: colors.text }]}>
              {showForgotPassword ? 'Сброс пароля' : isSignUp ? 'Создать аккаунт' : 'Вход'}
            </Text>
            <Text style={[styles.subtitle, { fontSize: typography.body, color: colors.muted }]}>
              {showForgotPassword
                ? 'Отправим ссылку для восстановления'
                : isSignUp
                  ? 'Начните изучение языков'
                  : 'Введите данные для входа'}
            </Text>
          </View>

          {/* Форма */}
          <View style={styles.form}>
            {!showForgotPassword ? (
              <>
                {/* Email */}
                <View style={[styles.inputContainer, { borderBottomWidth: inputBorder(emailFocused).borderBottomWidth, borderBottomColor: inputBorder(emailFocused).borderBottomColor }]}>
                  <Mail color={emailFocused ? colors.primary : colors.muted} size={moderateScale(18)} strokeWidth={1.8} style={styles.inputIcon} />
                  <TextInput
                    ref={emailInputRef}
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Email"
                    placeholderTextColor={colors.muted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                  />
                </View>

                {/* Password */}
                <View style={[styles.inputContainer, { borderBottomWidth: inputBorder(passwordFocused).borderBottomWidth, borderBottomColor: inputBorder(passwordFocused).borderBottomColor }]}>
                  <Lock color={passwordFocused ? colors.primary : colors.muted} size={moderateScale(18)} strokeWidth={1.8} style={styles.inputIcon} />
                  <TextInput
                    ref={passwordInputRef}
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Пароль"
                    placeholderTextColor={colors.muted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    onSubmitEditing={handleAuth}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={{ top: moderateScale(12), bottom: moderateScale(12), left: moderateScale(12), right: moderateScale(12) }}
                    activeOpacity={0.6}
                  >
                    {showPassword
                      ? <EyeOff color={colors.muted} size={moderateScale(18)} strokeWidth={1.8} />
                      : <Eye color={colors.muted} size={moderateScale(18)} strokeWidth={1.8} />
                    }
                  </TouchableOpacity>
                </View>

                {/* Forgot password link */}
                {!isSignUp && (
                  <TouchableOpacity
                    style={styles.forgotLink}
                    onPress={() => setShowForgotPassword(true)}
                    activeOpacity={0.6}
                  >
                    <Text style={[styles.forgotLinkText, { color: colors.primary }]}>Забыли пароль?</Text>
                  </TouchableOpacity>
                )}

                {/* Submit button */}
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }
                  ]}
                  onPress={handleAuth}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color={isDark ? '#020617' : '#FFFFFF'} size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      {isSignUp ? 'Создать аккаунт' : 'Войти'}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Google button */}
                {googleSignInAvailable && (
                  <TouchableOpacity
                    style={[styles.googleBtn, { borderColor: isDark ? 'rgba(148,163,184,0.3)' : 'rgba(148,163,184,0.4)' }]}
                    onPress={handleGoogleSignIn}
                    disabled={googleLoading}
                    activeOpacity={0.7}
                  >
                    {googleLoading ? (
                      <ActivityIndicator color={colors.text} size="small" />
                    ) : (
                      <>
                        <View style={styles.googleIconWrap}>
                          <GoogleIcon />
                        </View>
                        <Text style={[styles.googleBtnText, { color: colors.text }]}>
                          Продолжить через Google
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {/* Agreement checkboxes */}
                {isSignUp && (
                  <View style={styles.agreementBlock}>
                    <TouchableOpacity
                      style={styles.agreementRow}
                      onPress={() => setAgreementChecked(!agreementChecked)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.checkboxSquare,
                          {
                            backgroundColor: agreementChecked ? colors.primary : 'transparent',
                            borderColor: agreementChecked ? colors.primary : isDark ? 'rgba(148,163,184,0.3)' : 'rgba(148,163,184,0.4)',
                          },
                        ]}
                      >
                        {agreementChecked && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <Text style={[styles.agreementText, { color: colors.text }]}>
                        Я принимаю{' '}
                        <Text
                          style={[styles.linkText, { color: colors.primary }]}
                          onPress={(e) => {
                            e.stopPropagation();
                            Linking.openURL('https://smart-word.ru/privacy');
                          }}
                        >
                          Политику конфиденциальности
                        </Text>
                        {' '}и{' '}
                        <Text
                          style={[styles.linkText, { color: colors.primary }]}
                          onPress={(e) => {
                            e.stopPropagation();
                            Linking.openURL('https://smart-word.ru/terms');
                          }}
                        >
                          Условия использования
                        </Text>
                        .
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.agreementRow}
                      onPress={() => setPersonalDataConsentChecked(!personalDataConsentChecked)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.checkboxSquare,
                          {
                            backgroundColor: personalDataConsentChecked ? colors.primary : 'transparent',
                            borderColor: personalDataConsentChecked ? colors.primary : isDark ? 'rgba(148,163,184,0.3)' : 'rgba(148,163,184,0.4)',
                          },
                        ]}
                      >
                        {personalDataConsentChecked && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <Text style={[styles.agreementText, { color: colors.text }]}>
                        Я даю{' '}
                        <Text
                          style={[styles.linkText, { color: colors.primary }]}
                          onPress={(e) => {
                            e.stopPropagation();
                            Linking.openURL('https://smart-word.ru/consent');
                          }}
                        >
                          Согласие на обработку моих персональных данных
                        </Text>
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Resend verification */}
                {emailNotVerifiedShown && (
                  <TouchableOpacity
                    style={styles.resendBtn}
                    onPress={handleResendVerification}
                    disabled={resendLoading}
                    activeOpacity={0.7}
                  >
                    {resendLoading ? (
                      <ActivityIndicator color={colors.primary} size="small" />
                    ) : (
                      <Text style={[styles.resendText, { color: colors.primary }]}>Отправить письмо повторно</Text>
                    )}
                  </TouchableOpacity>
                )}

                {/* Toggle sign in/up */}
                <TouchableOpacity 
                  style={styles.toggleBtn} 
                  onPress={() => {
                    setIsSignUp((v) => !v);
                    setShowForgotPassword(false);
                    setEmailNotVerifiedShown(false);
                    setAgreementChecked(false);
                    setPersonalDataConsentChecked(false);
                  }}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.toggleText, { color: colors.muted }]}>
                    {isSignUp ? 'Уже есть аккаунт? ' : 'Нет аккаунта? '}
                    <Text style={[styles.toggleLinkText, { color: colors.primary }]}>
                      {isSignUp ? 'Войти' : 'Зарегистрироваться'}
                    </Text>
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Forgot password form */}
                <View style={[styles.inputContainer, { borderBottomWidth: inputBorder(emailFocused).borderBottomWidth, borderBottomColor: inputBorder(emailFocused).borderBottomColor }]}>
                  <Mail color={emailFocused ? colors.primary : colors.muted} size={moderateScale(18)} strokeWidth={1.8} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Email"
                    placeholderTextColor={colors.muted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!forgotLoading}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    onSubmitEditing={handleForgotPassword}
                  />
                </View>

                <View style={styles.forgotActions}>
                  <TouchableOpacity
                    style={[styles.forgotSubmitBtn, { backgroundColor: colors.primary, opacity: forgotLoading ? 0.7 : 1 }]}
                    onPress={handleForgotPassword}
                    disabled={forgotLoading}
                    activeOpacity={0.8}
                  >
                    {forgotLoading ? (
                      <ActivityIndicator color={isDark ? '#020617' : '#FFFFFF'} size="small" />
                    ) : (
                      <Text style={styles.forgotSubmitText}>Отправить ссылку</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.forgotBackBtn, { backgroundColor: isDark ? 'rgba(30,41,59,0.6)' : 'rgba(241,245,249,0.8)', borderColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(148,163,184,0.3)' }]}
                    onPress={() => setShowForgotPassword(false)}
                    disabled={forgotLoading}
                    activeOpacity={0.6}
                  >
                    <Text style={[styles.forgotBackText, { color: colors.text }]}>Назад ко входу</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

