import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Eye, EyeOff, Mail, Lock } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiPost, setTokens, getBaseUrl } from '../../lib/api';
import { GoogleSignin, googleSignInAvailable } from '../../lib/googleSignIn';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import { useTheme, fonts, spacing, typography, radii } from '../../theme';
import { Button } from '../../components/ui/Button';
import { importGuestDataIfNeeded } from '../../lib/guestImport';
import type { RootStackParamList } from '../../navigation/types';

/** Ник по умолчанию: часть email до @ (makar@gmail.com → makar) */
const nicknameFromEmail = (email: string) => {
  const part = email?.trim().split('@')[0] || '';
  return part || `user${Math.floor(100 + Math.random() * 900)}`;
};

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'>;

// SVG-подобный Google логотип через символы (без внешних зависимостей)
const GoogleIcon = ({ size = 18 }: { size?: number }) => (
  <Text style={{ fontSize: size, lineHeight: size + 2 }}>G</Text>
);

export const SignInScreen = ({ route, navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { setUser } = useAuth();
  const fromProfile = route.params?.fromProfile ?? false;

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

  // Анимации
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
    ]).start();
  }, []);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      showToast('Введите email и пароль', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('Пароль минимум 6 символов', 'error');
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
        const existing = await AsyncStorage.getItem('smartword_nickname');
        if (!existing?.trim()) {
          await AsyncStorage.setItem('smartword_nickname', nicknameFromEmail(data.user.email));
        }
        // После первого входа в новый аккаунт пробуем импортировать гостевые данные (словари, слова, архив)
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
      const data = await apiPost<{ message?: string }>('/auth/forgot-password', { email: email.trim() }, { skipAuth: true });
      showToast(data?.message || 'Письмо отправлено. Проверьте почту.', 'success');
      setShowForgotPassword(false);
    } catch (err: unknown) {
      const e = err as { body?: { error?: string } };
      showToast(e?.body?.error || 'Ошибка. Попробуйте позже.', 'error');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) return;
    setResendLoading(true);
    try {
      await apiPost<{ message?: string }>('/auth/resend-verification', { email: email.trim() }, { skipAuth: true });
      showToast('Письмо отправлено повторно. Проверьте почту.', 'success');
      setEmailNotVerifiedShown(false);
    } catch (err: unknown) {
      const e = err as { body?: { error?: string } };
      showToast(e?.body?.error || 'Ошибка. Попробуйте позже.', 'error');
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

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: 'transparent' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {fromProfile && (
        <TouchableOpacity
          style={[styles.backBtn, { top: insets.top + spacing.sm, backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft color={colors.text} size={20} />
        </TouchableOpacity>
      )}

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + (fromProfile ? 72 : spacing.xl * 2), paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <View style={[styles.authCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
            {/* Лого */}
            <View style={styles.logoBlock}>
              <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
                <Text style={styles.logoText}>SW</Text>
              </View>
              <Text style={[styles.appName, { color: colors.text }]}>SmartWord</Text>
              <Text style={[styles.tagline, { color: colors.muted }]}>
                {isSignUp ? 'Создайте аккаунт' : 'Войдите в аккаунт'}
              </Text>
            </View>

            {/* Google OAuth кнопка — только в dev/build, не в Expo Go */}
            {googleSignInAvailable && (
              <>
                <TouchableOpacity
                  style={[styles.googleBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={handleGoogleSignIn}
                  disabled={googleLoading}
                  activeOpacity={0.8}
                >
                  {googleLoading ? (
                    <ActivityIndicator color={colors.text} size="small" />
                  ) : (
                    <>
                      <View style={[styles.googleIconWrap, { backgroundColor: '#fff' }]}>
                        <Text style={styles.googleG}>G</Text>
                      </View>
                      <Text style={[styles.googleBtnText, { color: colors.text }]}>
                        Продолжить через Google
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                <View style={styles.dividerRow}>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                  <Text style={[styles.dividerText, { color: colors.muted }]}>или</Text>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                </View>
              </>
            )}

            {/* Форма */}
            <View style={styles.form}>
              <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Mail color={colors.muted} size={17} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Email"
                  placeholderTextColor={colors.muted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>

              <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Lock color={colors.muted} size={17} />
                <TextInput
                  style={[styles.input, styles.inputFlex, { color: colors.text }]}
                  placeholder="Пароль (минимум 6 символов)"
                  placeholderTextColor={colors.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleAuth}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                >
                  {showPassword
                    ? <EyeOff color={colors.muted} size={17} />
                    : <Eye color={colors.muted} size={17} />
                  }
                </TouchableOpacity>
              </View>

              {!isSignUp && !showForgotPassword && (
                <TouchableOpacity
                  style={styles.forgotLink}
                  onPress={() => setShowForgotPassword(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.forgotLinkText, { color: colors.primary }]}>Забыли пароль?</Text>
                </TouchableOpacity>
              )}

              {showForgotPassword && (
                <View style={[styles.forgotBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.forgotTitle, { color: colors.text }]}>Восстановление пароля</Text>
                  <Text style={[styles.forgotHint, { color: colors.muted }]}>Введите email — отправим ссылку для сброса пароля.</Text>
                  <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Mail color={colors.muted} size={17} />
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="Email"
                      placeholderTextColor={colors.muted}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!forgotLoading}
                    />
                  </View>
                  <View style={styles.forgotRow}>
                    <TouchableOpacity
                      style={[styles.forgotBackBtn, { borderColor: colors.border }]}
                      onPress={() => setShowForgotPassword(false)}
                      disabled={forgotLoading}
                    >
                      <Text style={[styles.forgotBackText, { color: colors.text }]}>Назад</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.submitBtn, { backgroundColor: colors.primary, flex: 1 }, forgotLoading && { opacity: 0.65 }]}
                      onPress={handleForgotPassword}
                      disabled={forgotLoading}
                    >
                      {forgotLoading ? <ActivityIndicator color="#000" size="small" /> : <Text style={styles.submitBtnText}>Отправить ссылку</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {!showForgotPassword && (
                <>
                  <Button
                    title={isSignUp ? 'Создать аккаунт' : 'Войти'}
                    onPress={handleAuth}
                    loading={loading}
                    variant="primary"
                    style={styles.submitBtn}
                  />

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
                </>
              )}

              <TouchableOpacity style={styles.toggleBtn} onPress={() => { setIsSignUp((v) => !v); setShowForgotPassword(false); setEmailNotVerifiedShown(false); }}>
                <Text style={[styles.toggleText, { color: colors.muted }]}>
                  {isSignUp ? 'Уже есть аккаунт? ' : 'Нет аккаунта? '}
                  <Text style={{ color: colors.primary, fontFamily: fonts.bold }}>
                    {isSignUp ? 'Войти' : 'Зарегистрироваться'}
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: {
    position: 'absolute',
    left: spacing.md,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.lg },
  content: { flex: 1, justifyContent: 'center', gap: spacing.lg },
  authCard: { padding: spacing.lg, borderRadius: radii.lg },
  logoBlock: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { fontSize: 26, fontFamily: fonts.headingBlack, color: '#000' },
  appName: { fontSize: typography.title, fontFamily: fonts.headingBlack },
  tagline: { fontSize: typography.body, fontFamily: fonts.regular },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  googleIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: {
    fontSize: 14,
    fontFamily: fonts.headingBold,
    color: '#4285F4',
  },
  googleBtnText: {
    fontSize: typography.body,
    fontFamily: fonts.medium,
  },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: typography.small },
  form: { gap: spacing.sm },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  input: { flex: 1, fontSize: typography.body, fontFamily: fonts.regular },
  inputFlex: { flex: 1 },
  submitBtn: {
    borderRadius: radii.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  submitBtnText: { fontSize: typography.body, fontFamily: fonts.bold, color: '#000' },
  forgotLink: { alignSelf: 'flex-end', marginTop: -spacing.xs, marginBottom: spacing.xs },
  forgotLinkText: { fontSize: typography.small, fontFamily: fonts.medium },
  forgotBlock: { padding: spacing.md, borderRadius: radii.md, borderWidth: 1, gap: spacing.sm, marginBottom: spacing.sm },
  forgotTitle: { fontSize: typography.body, fontFamily: fonts.bold },
  forgotHint: { fontSize: typography.small },
  forgotRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  forgotBackBtn: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: radii.md, borderWidth: 1, justifyContent: 'center' },
  forgotBackText: { fontSize: typography.body, fontFamily: fonts.medium },
  resendBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  resendText: { fontSize: typography.small, fontFamily: fonts.medium },
  toggleBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  toggleText: { fontSize: typography.small, fontFamily: fonts.regular },
});
