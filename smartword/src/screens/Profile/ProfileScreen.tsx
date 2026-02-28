import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Crown,
  LogOut,
  RefreshCw,
  BookOpen,
  Zap,
  MessageCircle,
  ChevronRight,
  Star,
  Settings,
  Heart,
  Headphones,
  Pencil,
  Check,
  X,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../hooks/useProfile';
import { useGroups } from '../../hooks/useGroups';
import { useWords } from '../../hooks/useWords';
import { PaywallModal } from '../../components/PaywallModal';
import { restorePurchases } from '../../lib/iap';
import { useTheme, fonts, spacing, radii, typography } from '../../theme';
import { useToast } from '../../components/Toast';
import type { RootStackParamList } from '../../navigation/types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const AVATAR_CHARS = ['🐱', '🐶', '🦊', '🐸', '🐼', '🐨', '🦁', '🐯', '🐧', '🦋'];
const AVATAR_COLORS = [
  '#FF6B6B', '#FFB347', '#FFD93D', '#6BCB77',
  '#4D96FF', '#C77DFF', '#FF6B9D', '#00B4D8',
  '#06D6A0', '#F4A261',
];

export const ProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, loading, refetch, avatarId, setAvatarId, nickname, setNickname } = useProfile();
  const { groups } = useGroups();
  const { totalCount: totalWords } = useWords();

  const [paywallVisible, setPaywallVisible] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [editingNick, setEditingNick] = useState(false);
  const [nickDraft, setNickDraft] = useState('');

  const handleSignOut = () => {
    Alert.alert('Выйти из аккаунта?', 'Вы уверены?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          await supabase.auth.signOut();
          setSigningOut(false);
        },
      },
    ]);
  };

  const handleRestorePurchases = async () => {
    setRestoring(true);
    const { error } = await restorePurchases();
    setRestoring(false);
    if (error) {
      showToast('Не удалось восстановить покупки', 'error');
    } else {
      await refetch();
      showToast('Покупки успешно восстановлены', 'success');
    }
  };

  const handleDonate = () => {
    Alert.alert(
      'Поддержать разработчика',
      'Спасибо, что пользуетесь SmartWord!\nВаша поддержка помогает развивать приложение.',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Поддержать', onPress: () => Linking.openURL('https://boosty.to') },
      ],
    );
  };

  const handleSupport = () => {
    Linking.openURL('mailto:smartword@gmail.com');
  };

  const startEditNick = () => {
    setNickDraft(nickname);
    setEditingNick(true);
  };

  const saveNick = () => {
    const trimmed = nickDraft.trim();
    if (trimmed.length > 20) {
      showToast('Ник не может быть длиннее 20 символов', 'error');
      return;
    }
    setNickname(trimmed);
    setEditingNick(false);
    showToast('Ник сохранён', 'success');
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const aiUsed = profile?.ai_messages_used ?? 0;
  const aiPercent = Math.min(aiUsed / 6, 1);
  const displayName = nickname || (profile ? 'Мой профиль' : 'Гостевой режим');
  const accentColor = AVATAR_COLORS[avatarId];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Кнопка настроек */}
      <TouchableOpacity
        style={[styles.settingsBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => navigation.navigate('ProfileSettings')}
        activeOpacity={0.7}
      >
        <Settings color={colors.muted} size={20} />
      </TouchableOpacity>

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
          <Text style={styles.avatarEmoji}>{AVATAR_CHARS[avatarId]}</Text>
          <View style={[styles.avatarEditBadge, { backgroundColor: colors.primary }]}>
            <Pencil color={colors.background} size={10} />
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
              <Check color={colors.background} size={16} strokeWidth={3} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setEditingNick(false)}
              style={[styles.nickActionBtn, { backgroundColor: colors.elevated }]}
              activeOpacity={0.8}
            >
              <X color={colors.muted} size={16} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.nickRow} onPress={startEditNick} activeOpacity={0.7}>
            <Text style={[styles.heroTitle, { color: colors.text }]}>{displayName}</Text>
            <Pencil color={colors.muted} size={13} style={{ marginTop: 2 }} />
          </TouchableOpacity>
        )}

        {profile?.is_premium && (
          <View style={[styles.premiumBadge, { backgroundColor: colors.primaryDim }]}>
            <Crown color={colors.primary} size={13} />
            <Text style={[styles.premiumBadgeText, { color: colors.primary }]}>Premium</Text>
          </View>
        )}
      </View>

      {/* Карточка статистики */}
      <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.statItem}>
          <View style={[styles.statIconWrap, { backgroundColor: colors.primaryDim }]}>
            <BookOpen color={colors.primary} size={15} />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{groups.length}</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Словарей</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <View style={[styles.statIconWrap, { backgroundColor: colors.primaryDim }]}>
            <Zap color={colors.primary} size={15} />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{totalWords}</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Слов</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <View style={[styles.statIconWrap, { backgroundColor: colors.primaryDim }]}>
            <MessageCircle color={colors.primary} size={15} />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {profile?.is_premium ? '∞' : `${aiUsed}/6`}
          </Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>AI-чат</Text>
        </View>
      </View>

      {/* AI прогресс */}
      {profile && !profile.is_premium && (
        <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: colors.text }]}>AI-сообщения</Text>
            <Text style={[styles.progressCount, { color: colors.muted }]}>{aiUsed} из 6</Text>
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
          <TouchableOpacity
            style={[styles.upgradeCard, { borderColor: colors.primary }]}
            onPress={() => setPaywallVisible(true)}
            activeOpacity={0.85}
          >
            <View style={styles.upgradeLeft}>
              <Crown color={colors.primary} size={26} />
              <View>
                <Text style={[styles.upgradeTitle, { color: colors.text }]}>SmartWord Premium</Text>
                <Text style={[styles.upgradeSubtitle, { color: colors.muted }]}>
                  Безлимит · AI-чат · от 299 ₽/мес
                </Text>
              </View>
            </View>
            <View style={[styles.upgradeArrow, { backgroundColor: colors.primary }]}>
              <ChevronRight color={colors.background} size={18} />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={[styles.premiumActiveCard, { backgroundColor: colors.primaryDim, borderColor: colors.primary }]}>
            <Crown color={colors.primary} size={22} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.upgradeTitle, { color: colors.primary }]}>Premium активен</Text>
              <Text style={[styles.upgradeSubtitle, { color: colors.primary, opacity: 0.7 }]}>
                Безлимитные группы, слова и AI-чат
              </Text>
            </View>
            <Star color={colors.primary} size={18} fill={colors.primary} />
          </View>
        )
      ) : (
        <View style={[styles.premiumActiveCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Crown color={colors.primary} size={22} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.upgradeTitle, { color: colors.text }]}>Создайте аккаунт</Text>
            <Text style={[styles.upgradeSubtitle, { color: colors.muted }]}>
              Сохраним ваш прогресс в облаке и откроем Premium-функции.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.upgradeArrow, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('SignIn', { fromProfile: true })}
            activeOpacity={0.85}
          >
            <ChevronRight color={colors.background} size={18} />
          </TouchableOpacity>
        </View>
      )}

      {/* Сообщество */}
      <Text style={[styles.sectionLabel, { color: colors.muted }]}>СООБЩЕСТВО</Text>
      <View style={[styles.menuBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.menuRow, { borderBottomColor: colors.border }]}
          onPress={handleSupport}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIcon, { backgroundColor: colors.primaryDim }]}>
            <Headphones color={colors.primary} size={17} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuText, { color: colors.text }]}>Написать в поддержку</Text>
            <Text style={[styles.menuSubText, { color: colors.muted }]}>Мы ответим как можно скорее</Text>
          </View>
          <ChevronRight color={colors.muted} size={18} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuRowLast} onPress={handleDonate} activeOpacity={0.7}>
          <View style={[styles.menuIcon, { backgroundColor: 'rgba(251,113,133,0.15)' }]}>
            <Heart color={colors.danger} size={17} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuText, { color: colors.text }]}>Поддержать разработчика</Text>
            <Text style={[styles.menuSubText, { color: colors.muted }]}>Помочь развитию SmartWord</Text>
          </View>
          <ChevronRight color={colors.muted} size={18} />
        </TouchableOpacity>
      </View>

      {/* Аккаунт */}
      <Text style={[styles.sectionLabel, { color: colors.muted }]}>АККАУНТ</Text>
      <View style={[styles.menuBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {profile ? (
          <>
            {!profile.is_premium && (
              <TouchableOpacity
                style={[styles.menuRow, { borderBottomColor: colors.border }]}
                onPress={handleRestorePurchases}
                disabled={restoring}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIcon, { backgroundColor: colors.primaryDim }]}>
                  <RefreshCw color={colors.primary} size={17} />
                </View>
                <Text style={[styles.menuText, { color: colors.text }]}>
                  {restoring ? 'Восстановление...' : 'Восстановить покупки'}
                </Text>
                <ChevronRight color={colors.muted} size={18} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.menuRowLast}
              onPress={handleSignOut}
              disabled={signingOut}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIcon, { backgroundColor: 'rgba(251,113,133,0.12)' }]}>
                <LogOut color={colors.danger} size={17} />
              </View>
              <Text style={[styles.menuText, { color: colors.danger }]}>
                {signingOut ? 'Выход...' : 'Выйти из аккаунта'}
              </Text>
              <ChevronRight color={colors.danger} size={18} />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.menuRowLast}
            onPress={() => navigation.navigate('SignIn', { fromProfile: true })}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: colors.primaryDim }]}>
              <Crown color={colors.primary} size={17} />
            </View>
            <Text style={[styles.menuText, { color: colors.text }]}>Войти или создать аккаунт</Text>
            <ChevronRight color={colors.muted} size={18} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={[styles.versionText, { color: colors.muted }]}>SmartWord v1.0.0</Text>

      {profile && (
        <PaywallModal
          visible={paywallVisible}
          onClose={() => setPaywallVisible(false)}
          reason="groups"
          onPurchaseSuccess={refetch}
        />
      )}

      {/* Модальное окно выбора аватарки */}
      <Modal
        visible={avatarModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setAvatarModalVisible(false)}
          />
          <View style={[styles.avatarSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.avatarSheetTitle, { color: colors.text }]}>Выберите аватарку</Text>
            <Text style={[styles.avatarSheetSubtitle, { color: colors.muted }]}>
              Выберите милого персонажа для вашего профиля
            </Text>
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
                      showToast('Аватарка обновлена!', 'success');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.avatarGridEmoji}>{emoji}</Text>
                    {isSelected && (
                      <View style={[styles.avatarSelectedBadge, { backgroundColor: color }]}>
                        <Check color="#fff" size={10} strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  settingsBtn: {
    alignSelf: 'flex-end',
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  avatarEmoji: {
    fontSize: 46,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
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
    minWidth: 160,
  },
  nickActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
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
  statsCard: {
    flexDirection: 'row',
    borderRadius: radii.md,
    borderWidth: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: typography.subtitle,
    fontFamily: fonts.headingBlack,
  },
  statLabel: {
    fontSize: typography.xs,
    fontFamily: fonts.regular,
  },
  statDivider: {
    width: 1,
    height: 36,
  },
  progressCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
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
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
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
    width: 32,
    height: 32,
    borderRadius: 16,
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
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    fontSize: typography.body,
    fontFamily: fonts.medium,
  },
  menuSubText: {
    fontSize: typography.small,
    fontFamily: fonts.regular,
    marginTop: 1,
  },
  versionText: {
    textAlign: 'center',
    fontSize: typography.small,
    fontFamily: fonts.regular,
    marginTop: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  avatarSheet: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  avatarSheetTitle: {
    fontSize: typography.subtitle,
    fontFamily: fonts.headingBold,
    textAlign: 'center',
  },
  avatarSheetSubtitle: {
    fontSize: typography.small,
    fontFamily: fonts.regular,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  avatarGridItem: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGridEmoji: {
    fontSize: 32,
  },
  avatarSelectedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
