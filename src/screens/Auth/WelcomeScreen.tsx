import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, spacing, radii, typography, fonts } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

const { width, height } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

const FEATURES = [
  { icon: '🗂️', title: 'Личные словари', desc: 'Создавайте тематические словари для любого языка' },
  { icon: '🔄', title: 'Умные тренировки', desc: 'Свайпы, письмо, AI-диалоги — всё в одном месте' },
  { icon: '🤖', title: 'AI-собеседник', desc: 'Практикуйте живой разговор с Lexi на любом языке' },
];

export const WelcomeScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { setGuestMode, setHasAccount } = useAuth();

  // Анимации
  const logoAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const featuresAnim = useRef(new Animated.Value(0)).current;
  const buttonsAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Последовательная анимация появления
    Animated.stagger(120, [
      Animated.spring(logoAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.spring(titleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.spring(featuresAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.spring(buttonsAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }),
    ]).start();

    // Плавающая анимация логотипа
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration: 2200, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ])
    );
    loop.start();

    return () => {
      loop.stop();
    };
  }, []);

  const handleGuest = async () => {
    await setGuestMode(true);
    navigation.replace('Main');
  };

  const handleSignIn = async () => {
    await setHasAccount(true);
    navigation.navigate('SignIn');
  };

  const makeSlide = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Декоративные круги на фоне */}
      <View style={[styles.bgCircle1, { backgroundColor: isDark ? '#0EA5E920' : '#0EA5E915' }]} />
      <View style={[styles.bgCircle2, { backgroundColor: isDark ? '#38BDF812' : '#0EA5E910' }]} />

      <View style={styles.inner}>
        {/* Логотип */}
        <Animated.View
          style={[
            styles.logoWrap,
            makeSlide(logoAnim),
            { transform: [
              { translateY: Animated.add(
                logoAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }),
                floatAnim
              )},
            ]},
          ]}
        >
          <View style={[styles.logoOuter, { borderColor: `${colors.primary}40` }]}>
            <View style={[styles.logoInner, { backgroundColor: colors.primary }]}>
              <Text style={styles.logoLetters}>SW</Text>
            </View>
          </View>
          <View style={[styles.logoBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.logoBadgeText, { color: colors.primary }]}>✦ AI-powered</Text>
          </View>
        </Animated.View>

        {/* Заголовок */}
        <Animated.View style={[styles.titleBlock, makeSlide(titleAnim)]}>
          <Text style={[styles.title, { color: colors.text }]}>
            Учи слова,{'\n'}которые остаются
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Свайпы · Письмо · AI-диалоги
          </Text>
        </Animated.View>

        {/* Фичи */}
        <Animated.View style={[styles.features, makeSlide(featuresAnim)]}>
          {FEATURES.map((f, i) => (
            <View
              key={i}
              style={[styles.featureRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <View style={styles.featureText}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>{f.title}</Text>
                <Text style={[styles.featureDesc, { color: colors.muted }]}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        {/* Кнопки */}
        <Animated.View style={[styles.buttons, makeSlide(buttonsAnim)]}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={handleSignIn}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryBtnText}>Войти или создать аккаунт</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ghostBtn, { borderColor: isDark ? 'rgba(148,163,184,0.3)' : 'rgba(148,163,184,0.4)' }]}
            onPress={handleGuest}
            activeOpacity={0.6}
          >
            <Text style={[styles.ghostBtnText, { color: colors.muted }]}>
              Начать без аккаунта
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgCircle1: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    top: -width * 0.5,
    left: -width * 0.1,
  },
  bgCircle2: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    bottom: height * 0.1,
    right: -width * 0.3,
  },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    gap: spacing.xl,
  },
  logoWrap: { alignItems: 'center', gap: spacing.sm },
  logoOuter: {
    width: 96,
    height: 96,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInner: {
    width: 76,
    height: 76,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetters: {
    fontSize: 28,
    fontFamily: fonts.headingBlack,
    color: '#000',
  },
  logoBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  logoBadgeText: {
    fontSize: typography.xs,
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
  },
  titleBlock: { alignItems: 'center', gap: spacing.sm },
  title: {
    fontSize: 32,
    fontFamily: fonts.headingBlack,
    textAlign: 'center',
    lineHeight: 42,
  },
  subtitle: {
    fontSize: typography.body,
    fontFamily: fonts.regular,
    textAlign: 'center',
    letterSpacing: 1,
  },
  features: { gap: spacing.sm },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  featureIcon: { fontSize: 22 },
  featureText: { flex: 1, gap: 2 },
  featureTitle: { fontSize: typography.small, fontFamily: fonts.bold },
  featureDesc: { fontSize: typography.xs, lineHeight: 17 },
  buttons: { gap: spacing.sm },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: spacing.md + 4,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: typography.body,
    fontFamily: fonts.bold,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  ghostBtn: {
    borderRadius: 14,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  ghostBtnText: {
    fontSize: typography.body,
    fontFamily: fonts.medium,
    letterSpacing: 0.3,
  },
  hint: {
    fontSize: typography.small,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
