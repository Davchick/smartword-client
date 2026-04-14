import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  TextInput,
  Linking,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Crown,
  LogOut,
  ChevronRight,
  Star,
  Settings,
  Heart,
  Headphones,
  Pencil,
  Check,
  X,
} from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../hooks/useProfile';
import { useTrainingProgress } from '../../hooks/useTrainingProgress';
import { SkeletonScreen } from '../../components/ui/SkeletonScreen';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { useStreak } from '../../hooks/useStreak';
import { queryClient } from '../../lib/queryClient';
import { queryKey } from '../../lib/queryKeys';
import { useTheme, fonts, spacing, radii, typography } from '../../theme';
import { useDeviceSize } from '../../hooks/useDeviceSize';
import { moderateScale, scale } from '../../utils/responsive';
import type { RootStackParamList } from '../../navigation/types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProgressChart } from '../../components/ProgressChart';
import { StreakCounter } from '../../components/StreakCounter';

const AVATAR_CHARS = ['🐱', '🐶', '🦊', '🐸', '🐼', '🐨', '🦁', '🐯', '🐧', '🦋'];
const AVATAR_COLORS = [
  '#FF6B6B', '#FFB347', '#FFD93D', '#6BCB77',
  '#4D96FF', '#C77DFF', '#FF6B9D', '#00B4D8',
  '#06D6A0', '#F4A261',
];

export const ProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const deviceSize = useDeviceSize();
  const { signOut } = useAuth();
  const { profile, loading, refetch, avatarId, setAvatarId, nickname, setNickname } = useProfile();
  const { progress: trainingProgress, loading: progressLoading } = useTrainingProgress();
  const { streak } = useStreak();

  const [signingOut, setSigningOut] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [editingNick, setEditingNick] = useState(false);
  const [nickDraft, setNickDraft] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // Инвалидируем только profile — stats и streaks обновятся по staleTime
    await queryClient.invalidateQueries({ queryKey: queryKey.profile.me() });
    setLastUpdated(new Date());
    setRefreshing(false);
  }, []);

  const handleSignOut = () => {
    Alert.alert('Выйти из аккаунта?', 'Вы уверены?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          await signOut();
          setSigningOut(false);
        },
      },
    ]);
  };

  const handleDonate = () => {
    Linking.openURL('https://dalink.to/davch1ck');
  };

  const handleSupport = () => {
    Linking.openURL('mailto:support@smart-word.ru');
  };

  const startEditNick = () => {
    setNickDraft(nickname);
    setEditingNick(true);
  };

  const saveNick = () => {
    const trimmed = nickDraft.trim();
    if (trimmed.length > 20) {
      Alert.alert('Ошибка', 'Ник не может быть длиннее 20 символов');
      return;
    }
    setNickname(trimmed);
    setEditingNick(false);
    Alert.alert('Готово', 'Ник сохранён');
  };

  const aiUsed = profile?.ai_messages_used ?? 0;
  const aiPercent = useMemo(() => Math.min(aiUsed / 10, 1), [aiUsed]);
  const displayName = useMemo(() => nickname || (profile ? 'Мой профиль' : 'Гостевой режим'), [nickname, profile]);
  const safeAvatarId = useMemo(() => {
    if (typeof avatarId !== 'number' || isNaN(avatarId) || avatarId < 0 || avatarId >= AVATAR_CHARS.length) {
      return 0;
    }
    return avatarId;
  }, [avatarId]);
  const accentColor = useMemo(() => AVATAR_COLORS[safeAvatarId], [safeAvatarId]);
  const styles = useProfileStyles();

  if (loading) {
    return <SkeletonScreen type="profile" showStats />;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: 'transparent' }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xl },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        profile ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ) : undefined
      }
    >
      {/* Кнопка настроек */}
      <View style={styles.settingsContainer}>
        <TouchableOpacity
          style={[
            styles.settingsBtn,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={() => navigation.navigate('ProfileSettings')}
          activeOpacity={0.7}
        >
          <Settings color={colors.muted} size={moderateScale(20)} />
        </TouchableOpacity>
      </View>

      {/* Герой — аватар + ник */}
      <View style={styles.heroSection}>
        <TouchableOpacity
          style={[
            styles.avatarCircle,
            {
              backgroundColor: accentColor + '22',
              borderColor: accentColor + '88',
              borderWidth: 2.5,
            },
          ]}
          onPress={() => setAvatarModalVisible(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.avatarEmoji}>{AVATAR_CHARS[safeAvatarId]}</Text>
          <View style={[styles.avatarEditBadge, { backgroundColor: colors.primary }]}>
            <Pencil color={colors.background} size={moderateScale(10)} />
          </View>
        </TouchableOpacity>

          {editingNick ? (
            <View style={styles.nickEditRow}>
              <TextInput
                style={[
                  styles.nickInput,
                  { color: colors.text, borderColor: colors.primary, backgroundColor: colors.card },
                ]}
                value={nickDraft}
                onChangeText={setNickDraft}
                autoFocus
                maxLength={20}
                placeholder="Введите ник..."
                placeholderTextColor={colors.muted}
              />
              <TouchableOpacity
                onPress={saveNick}
                style={[styles.nickActionBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
              >
                <Check color={colors.background} size={moderateScale(16)} strokeWidth={3} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setEditingNick(false)}
                style={[styles.nickActionBtn, { backgroundColor: colors.elevated }]}
                activeOpacity={0.8}
              >
                <X color={colors.muted} size={moderateScale(16)} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.nickRow} onPress={startEditNick} activeOpacity={0.7}>
              <Text style={[styles.heroTitle, { color: colors.text }]}>{displayName}</Text>
              <Pencil color={colors.muted} size={moderateScale(13)} style={{ marginTop: 2 }} />
            </TouchableOpacity>
          )}
      </View>

      {/* График прогресса тренировок */}
      <ProgressChart data={trainingProgress} />

      {/* Streak Counter */}
      {streak && (
        <StreakCounter
          streak={streak.currentStreak}
          longestStreak={streak.longestStreak}
          size="large"
        />
      )}

      {/* AI прогресс */}
      {profile && !profile.is_premium && (
        <View style={[styles.progressCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: colors.text }]}>AI-сообщения</Text>
            <Text style={[styles.progressCount, { color: colors.muted }]}>{aiUsed} из 10</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${aiPercent * 100}%` as any,
                  backgroundColor: aiPercent >= 1 ? colors.danger : colors.primary,
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* Premium блок */}
      {profile ? (
        !profile.is_premium ? (
          <View style={[styles.upgradeCard, { borderColor: colors.primary, backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={styles.upgradeLeft}
              onPress={() => navigation.navigate('BillingPayment')}
              activeOpacity={0.85}
            >
              <Crown color={colors.primary} size={moderateScale(26)} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[styles.upgradeTitle, { color: colors.text }]}>SmartWord Premium</Text>
                <Text style={[styles.upgradeSubtitle, { color: colors.muted }]}>
                  Безлимит · AI-чат · от 264 ₽/мес
                </Text>
              </View>
              <View
                style={[
                  styles.upgradeArrow,
                  {
                    backgroundColor: colors.primary,
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.4,
                    shadowRadius: 12,
                    elevation: 6,
                  },
                ]}
              >
                <ChevronRight color={colors.background} size={moderateScale(18)} />
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.premiumActiveCard, { borderColor: colors.primary, backgroundColor: colors.card }]}>
            <Crown color={colors.primary} size={moderateScale(22)} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.upgradeTitle, { color: colors.primary }]}>Premium активен</Text>
              <Text style={[styles.upgradeSubtitle, { color: colors.primary, opacity: 0.7 }]}>
                Безлимитные группы, слова и AI-чат
              </Text>
            </View>
            <Star color={colors.primary} size={moderateScale(18)} fill={colors.primary} />
          </View>
        )
      ) : (
        <TouchableOpacity
          style={[styles.premiumActiveCard, { borderColor: colors.border, backgroundColor: colors.card }]}
          onPress={() => navigation.navigate('SignIn', { fromProfile: true })}
          activeOpacity={0.85}
        >
          <Crown color={colors.primary} size={moderateScale(22)} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.upgradeTitle, { color: colors.text }]}>Создайте аккаунт</Text>
            <Text style={[styles.upgradeSubtitle, { color: colors.muted }]}>
              Сохраним прогресс и откроем дополнительные функции.
            </Text>
          </View>
          <View style={[styles.upgradeArrow, { backgroundColor: colors.primary }]}>
            <ChevronRight color={colors.background} size={moderateScale(18)} />
          </View>
        </TouchableOpacity>
      )}

      {/* Сообщество */}
      <Text style={[styles.sectionLabel, { color: colors.muted }]}>СООБЩЕСТВО</Text>
      <View style={[styles.menuBlock, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[styles.menuRow, { borderBottomColor: colors.border }]}
          onPress={handleSupport}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIcon, { backgroundColor: colors.primaryDim }]}>
            <Headphones color={colors.primary} size={moderateScale(17)} />
          </View>
          <View style={styles.menuTextWrapper}>
            <Text style={[styles.menuText, { color: colors.text }]}>Написать в поддержку</Text>
            <Text style={[styles.menuSubText, { color: colors.muted }]}>Мы ответим как можно скорее</Text>
          </View>
          <ChevronRight color={colors.muted} size={moderateScale(18)} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuRowLast} onPress={handleDonate} activeOpacity={0.7}>
          <View style={[styles.menuIcon, { backgroundColor: 'rgba(251,113,133,0.15)' }]}>
            <Heart color={colors.danger} size={moderateScale(17)} />
          </View>
          <View style={styles.menuTextWrapper}>
            <Text style={[styles.menuText, { color: colors.text }]}>Поддержать разработчика</Text>
            <Text style={[styles.menuSubText, { color: colors.muted }]}>Помочь развитию SmartWord</Text>
          </View>
          <ChevronRight color={colors.muted} size={moderateScale(18)} />
        </TouchableOpacity>
      </View>

      {/* Аккаунт */}
      <Text style={[styles.sectionLabel, { color: colors.muted }]}>АККАУНТ</Text>
      <View style={[styles.menuBlock, { borderColor: colors.border, backgroundColor: colors.card }]}>
        {profile ? (
          <>
            <TouchableOpacity
              style={styles.menuRowLast}
              onPress={handleSignOut}
              disabled={signingOut}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIcon, { backgroundColor: 'rgba(251,113,133,0.12)' }]}>
                <LogOut color={colors.danger} size={moderateScale(17)} />
              </View>
              <Text style={[styles.menuText, { color: colors.danger }]}>
                {signingOut ? 'Выход...' : 'Выйти из аккаунта'}
              </Text>
              <ChevronRight color={colors.danger} size={moderateScale(18)} />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.menuRowLast}
            onPress={() => navigation.navigate('SignIn', { fromProfile: true })}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: colors.primaryDim }]}>
              <Crown color={colors.primary} size={moderateScale(17)} />
            </View>
            <Text style={[styles.menuText, { color: colors.text }]}>Войти или создать аккаунт</Text>
            <ChevronRight color={colors.muted} size={moderateScale(18)} />
          </TouchableOpacity>
        )}
      </View>

      {lastUpdated && (
        <Text 
          style={[styles.lastUpdated, { color: colors.muted }]}
          accessibilityRole="text"
          accessibilityLabel={`Последнее обновление: ${lastUpdated.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`}
          accessibilityLiveRegion="polite"
        >
          Обновлено: {lastUpdated.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      )}

      <Text style={[styles.versionText, { color: colors.muted }]}>SmartWord v1.0.0</Text>

      {/* Модальное окно выбора аватарки */}
      <BottomSheet
        visible={avatarModalVisible}
        onClose={() => setAvatarModalVisible(false)}
        title="Выберите аватарку"
        subtitle="Выберите милого персонажа для вашего профиля"
        showHandle={true}
      >
        <View style={styles.avatarGrid}>
          {AVATAR_CHARS.map((emoji, idx) => {
            const isSelected = avatarId === idx;
            const color = AVATAR_COLORS[idx];
            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.avatarGridItem,
                  {
                    backgroundColor: color + '22',
                    borderColor: isSelected ? color : 'transparent',
                    borderWidth: 2.5,
                  },
                ]}
                onPress={() => {
                  setAvatarId(idx);
                  setAvatarModalVisible(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.avatarGridEmoji}>{emoji}</Text>
                {isSelected && (
                  <View style={[styles.avatarSelectedBadge, { backgroundColor: color }]}>
                    <Check color="#fff" size={moderateScale(10)} strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </BottomSheet>
    </ScrollView>
  );
};

const useProfileStyles = () => {
  const { colors } = useTheme();
  const { isSmall, isLarge, spacing, radii, typography: typo } = useDeviceSize();

  const avatarSize = isSmall ? 80 : isLarge ? 100 : 90;
  const avatarEmojiSize = isSmall ? 40 : isLarge ? 52 : 46;
  const editBadgeSize = moderateScale(22);
  const editPencilSize = moderateScale(10);
  const nickActionSize = moderateScale(34);
  const menuIconSize = moderateScale(34);
  const menuIconInner = moderateScale(17);
  const gridItemSize = isSmall ? 56 : isLarge ? 72 : 64;
  const gridEmojiSize = isSmall ? 28 : isLarge ? 36 : 32;
  const selectedBadgeSize = moderateScale(18);

  return StyleSheet.create({
    content: {
      paddingHorizontal: spacing.lg,
      gap: spacing.md,
    },
    settingsContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      width: '100%',
      marginTop: spacing.xs,
    },
    settingsBtn: {
      width: moderateScale(40),
      height: moderateScale(40),
      borderRadius: radii.sm,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroSection: {
      alignItems: 'center',
      paddingBottom: spacing.sm,
      gap: spacing.sm,
    },
    avatarCircle: {
      width: avatarSize,
      height: avatarSize,
      borderRadius: avatarSize / 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarEmoji: {
      fontSize: avatarEmojiSize,
    },
    avatarEditBadge: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: editBadgeSize,
      height: editBadgeSize,
      borderRadius: editBadgeSize / 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nickRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    heroTitle: {
      fontSize: typography.subtitle,
      fontFamily: fonts.headingBold,
    },
    nickEditRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    nickInput: {
      fontSize: typography.body,
      fontFamily: fonts.medium,
      borderWidth: 1.5,
      borderRadius: radii.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      minWidth: scale(160),
    },
    nickActionBtn: {
      width: nickActionSize,
      height: nickActionSize,
      borderRadius: moderateScale(10),
      alignItems: 'center',
      justifyContent: 'center',
    },
    premiumBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 4,
      borderRadius: radii.full,
    },
    premiumBadgeText: {
      fontSize: typography.small,
      fontFamily: fonts.bold,
    },
    progressCard: {
      borderRadius: radii.md,
      borderWidth: 1,
      padding: spacing.md,
      gap: spacing.sm,
    },
    progressEmpty: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.lg,
    },
progressEmptyText: {
      fontSize: typography.small,
      fontFamily: fonts.regular,
    },

    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    progressTitle: {
      fontSize: typography.small,
      fontFamily: fonts.medium,
    },
    progressCount: {
      fontSize: typography.small,
      fontFamily: fonts.regular,
    },
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    progressTitle: {
      fontSize: typography.small,
      fontFamily: fonts.medium,
    },
    progressCount: {
      fontSize: typography.small,
      fontFamily: fonts.regular,
    },
    progressTrack: {
      height: moderateScale(6),
      borderRadius: moderateScale(3),
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: moderateScale(3),
    },
    upgradeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: radii.md,
      borderWidth: 1.5,
      padding: spacing.md,
      gap: spacing.md,
    },
    upgradeLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      flex: 1,
    },
    upgradeTitle: {
      fontSize: typography.body,
      fontFamily: fonts.headingBold,
    },
    upgradeSubtitle: {
      fontSize: typography.small,
      fontFamily: fonts.regular,
      marginTop: 2,
    },
    upgradeArrow: {
      width: moderateScale(32),
      height: moderateScale(32),
      borderRadius: moderateScale(16),
      alignItems: 'center',
      justifyContent: 'center',
    },
    premiumActiveCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1.5,
      padding: spacing.md,
    },
    sectionLabel: {
      fontSize: typography.xs,
      fontFamily: fonts.bold,
      letterSpacing: 1.2,
      marginTop: spacing.sm,
      marginLeft: spacing.xs,
    },
    menuBlock: {
      borderRadius: radii.md,
      borderWidth: 1,
      overflow: 'hidden',
    },
    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      gap: spacing.md,
      borderBottomWidth: 1,
    },
    menuRowLast: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      gap: spacing.md,
    },
    menuTextWrapper: {
      flex: 1,
    },
    menuIcon: {
      width: menuIconSize,
      height: menuIconSize,
      borderRadius: moderateScale(10),
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuText: {
      fontSize: typography.body,
      fontFamily: fonts.medium,
      lineHeight: typography.body * 1.4,
    },
    menuSubText: {
      fontSize: typography.small,
      fontFamily: fonts.regular,
      lineHeight: typography.small * 1.4,
    },
    versionText: {
      textAlign: 'center',
      fontSize: typography.small,
      fontFamily: fonts.regular,
      marginTop: spacing.sm,
    },
    lastUpdated: {
      textAlign: 'center',
      fontSize: typography.xs,
      fontFamily: fonts.regular,
      marginTop: spacing.xs,
    },
    avatarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    avatarGridItem: {
      width: gridItemSize,
      height: gridItemSize,
      borderRadius: moderateScale(20),
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarGridEmoji: {
      fontSize: gridEmojiSize,
    },
    avatarSelectedBadge: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: selectedBadgeSize,
      height: selectedBadgeSize,
      borderRadius: selectedBadgeSize / 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
};
