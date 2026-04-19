import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Mail, Calendar, Trash2, LogOut } from 'lucide-react-native';
import { useTheme, fonts, spacing, radii, typography } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';

export const ProfileAccountScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { user: authUser, signOut } = useAuth();
  const { showToast } = useToast();

  const handleDeleteAccount = () => {
    Alert.alert(
      'Удалить аккаунт',
      'Вы уверены, что хотите удалить аккаунт? Это действие необратимо, все ваши данные будут удалены.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            showToast('Функция временно недоступна', 'info');
          },
        },
      ],
    );
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Выйти из аккаунта',
      'Вы уверены, что хотите выйти?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              showToast('Вы вышли из аккаунта', 'success');
            } catch {
              showToast('Не удалось выйти', 'error');
            }
          },
        },
      ],
    );
  };

  if (!authUser) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm, borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <ArrowLeft color={colors.text} size={22} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Аккаунт</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={[styles.emptyContainer, { paddingBottom: insets.bottom }]}>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            Войдите в аккаунт, чтобы просматривать информацию
          </Text>
          <TouchableOpacity
            style={[styles.signInBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('SignIn' as never)}
            activeOpacity={0.85}
          >
            <Text style={styles.signInBtnText}>Войти</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ArrowLeft color={colors.text} size={22} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Аккаунт</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>ИНФОРМАЦИЯ</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.infoRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            <View style={[styles.menuIcon, { backgroundColor: colors.primaryDim }]}>
              <Mail color={colors.primary} size={17} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuText, { color: colors.text }]} numberOfLines={1}>
                {authUser.email}
              </Text>
              <Text style={[styles.menuMeta, { color: colors.muted }]}>Электронная почта</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.menuIcon, { backgroundColor: colors.primaryDim }]}>
              <Calendar color={colors.primary} size={17} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuText, { color: colors.text }]}>
                {new Date(authUser.created_at).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
              <Text style={[styles.menuMeta, { color: colors.muted }]}>Дата создания аккаунта</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.muted }]}>ОПАСНАЯ ЗОНА</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: colors.dangerDim }]}>
              <Trash2 color={colors.danger} size={17} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuText, { color: colors.danger }]}>Удалить аккаунт</Text>
              <Text style={[styles.menuMeta, { color: colors.muted }]}>Безвозвратное действие</Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.signOutBtn, { borderColor: colors.border }]}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <LogOut color={colors.muted} size={17} />
          <Text style={[styles.signOutText, { color: colors.muted }]}>Выйти из аккаунта</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: typography.subtitle, fontFamily: fonts.headingBold },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.sm },
  sectionLabel: {
    fontSize: typography.xs,
    fontFamily: fonts.bold,
    letterSpacing: 1.2,
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
    marginBottom: 2,
  },
  card: { borderRadius: radii.md, borderWidth: 1, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md },
  menuRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  menuText: { fontSize: typography.body, fontFamily: fonts.medium },
  menuMeta: { fontSize: typography.small, fontFamily: fonts.regular },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyText: { fontSize: typography.body, textAlign: 'center', marginBottom: spacing.lg },
  signInBtn: {
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  signInBtnText: {
    fontSize: typography.body,
    fontFamily: fonts.bold,
    color: '#000',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  signOutText: { fontSize: typography.body, fontFamily: fonts.medium },
});