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
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Eye, EyeOff, Mail, Lock } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';
import { useTheme, fonts, spacing, typography, radii } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

const generateNickname = () => `user${Math.floor(100 + Math.random() * 900)}`;

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'>;

// SVG-подобный Google логотип через символы (без внешних зависимостей)
const GoogleIcon = ({ size = 18 }: { size?: number }) => (
  <Text style={{ fontSize: size, lineHeight: size + 2 }}>G</Text>
);

export const SignInScreen = ({ route, navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const fromProfile = route.params?.fromProfile ?? false;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email: email.trim(), password });
      setLoading(false);
      if (error) {
        showToast(error.message, 'error');
      } else {
        const existing = await AsyncStorage.getItem('smartword_nickname');
        if (!existing?.trim()) {
          await AsyncStorage.setItem('smartword_nickname', generateNickname());
        }
        showToast('Письмо с подтверждением отправлено на почту', 'success', 5000);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setLoading(false);
      if (error) {
        const msg = error.message.toLowerCase().includes('invalid')
          ? 'Неверный email или пароль'
          : error.message;
        showToast(msg, 'error');
      } else {
        showToast('Добро пожаловать!', 'success');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'smartword://auth/callback',
          skipBrowserRedirect: true,
        },
      });
      if (error) {
        showToast('Не удалось войти через Google', 'error');
        return;
      }
      if (data?.url) {
        await Linking.openURL(data.url);
      }
    } catch {
      showToast('Ошибка при входе через Google', 'error');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
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

          {/* Google OAuth кнопка */}
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

          {/* Разделитель */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.muted }]}>или</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

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

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary }, loading && { opacity: 0.65 }]}
              onPress={handleAuth}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {isSignUp ? 'Создать аккаунт' : 'Войти'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.toggleBtn} onPress={() => setIsSignUp((v) => !v)}>
              <Text style={[styles.toggleText, { color: colors.muted }]}>
                {isSignUp ? 'Уже есть аккаунт? ' : 'Нет аккаунта? '}
                <Text style={{ color: colors.primary, fontFamily: fonts.bold }}>
                  {isSignUp ? 'Войти' : 'Зарегистрироваться'}
                </Text>
              </Text>
            </TouchableOpacity>
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
  toggleBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  toggleText: { fontSize: typography.small, fontFamily: fonts.regular },
});
