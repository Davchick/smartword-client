import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  Sun,
  Moon,
  Monitor,
  Lock,
  ChevronRight,
  Check,
  Bell,
  Info,
  Eye,
  EyeOff,
  Trophy,
} from 'lucide-react-native';
import { useTheme, fonts, spacing, radii, typography } from '../../theme';
import { useThemeContext } from '../../theme/ThemeContext';
import { apiPatch, apiPost, getBaseUrl } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';

type ThemeMode = 'system' | 'dark' | 'light';

const THEME_OPTIONS: Array<{ label: string; value: ThemeMode }> = [
  { label: 'Как в системе', value: 'system' },
  { label: 'Тёмная', value: 'dark' },
  { label: 'Светлая', value: 'light' },
];

export const ProfileSettingsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { themeMode, setThemeMode } = useThemeContext();
  const { showToast } = useToast();

  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [step, setStep] = useState<'current' | 'new'>('current');
  const [verifying, setVerifying] = useState(false);

  const { user: authUser } = useAuth();
  const canChangePassword = !!authUser && !!getBaseUrl();

  const resetModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setStep('current');
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  const handleCloseModal = () => {
    setPasswordModalVisible(false);
    resetModal();
  };

  const handleVerifyCurrentPassword = async () => {
    if (!currentPassword) {
      showToast('Введите текущий пароль', 'error');
      return;
    }
    setVerifying(true);
    try {
      // Таймаут 10 секунд для защиты от зависания
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      await apiPost('/auth/verify-password', { currentPassword }, { signal: controller.signal });
      
      clearTimeout(timeoutId);
      setStep('new');
    } catch (err: unknown) {
      const e = err as { status?: number; body?: { error?: string }; message?: string; name?: string };
      if (e?.name === 'AbortError' || e?.message?.includes('abort')) {
        showToast('Превышено время ожидания. Попробуйте снова.', 'error');
      } else {
        showToast(e?.body?.error || 'Неверный текущий пароль', 'error');
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      showToast('Пароль должен быть не менее 6 символов', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Пароли не совпадают', 'error');
      return;
    }
    if (newPassword === currentPassword) {
      showToast('Новый пароль должен отличаться от текущего', 'error');
      return;
    }
    setChangingPassword(true);
    try {
      // Таймаут 10 секунд для защиты от зависания
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      await apiPatch('/auth/password', { currentPassword, newPassword }, { signal: controller.signal });

      clearTimeout(timeoutId);
      showToast('Пароль успешно изменён', 'success');
      handleCloseModal();
    } catch (err: unknown) {
      const e = err as { status?: number; body?: { error?: string }; message?: string; name?: string };
      if (e?.name === 'AbortError' || e?.message?.includes('abort')) {
        showToast('Превышено время ожидания. Попробуйте снова.', 'error');
      } else if (e?.status === 401) {
        showToast(e?.body?.error || 'Неверный текущий пароль', 'error');
      } else {
        showToast('Не удалось изменить пароль. Попробуйте снова.', 'error');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ArrowLeft color={colors.text} size={22} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Настройки</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Тема */}
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>ТЕМА ПРИЛОЖЕНИЯ</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {THEME_OPTIONS.map((opt, idx) => {
            const isSelected = themeMode === opt.value;
            const isLast = idx === THEME_OPTIONS.length - 1;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.themeRow, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                onPress={() => setThemeMode(opt.value)}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIcon, { backgroundColor: isSelected ? colors.primaryDim : colors.elevated }]}>
                  {opt.value === 'system' && <Monitor color={isSelected ? colors.primary : colors.muted} size={16} />}
                  {opt.value === 'dark' && <Moon color={isSelected ? colors.primary : colors.muted} size={16} />}
                  {opt.value === 'light' && <Sun color={isSelected ? colors.primary : colors.muted} size={16} />}
                </View>
                <Text style={[styles.menuText, { color: isSelected ? colors.text : colors.textSecondary }]}>
                  {opt.label}
                </Text>
                {isSelected && (
                  <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                    <Check color={colors.background} size={12} strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Безопасность */}
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>БЕЗОПАСНОСТЬ</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              if (!canChangePassword) {
                showToast('Войдите в аккаунт для смены пароля', 'error');
                return;
              }
              setPasswordModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: colors.primaryDim }]}>
              <Lock color={colors.primary} size={17} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuText, { color: colors.text }]}>Изменить пароль</Text>
              {!canChangePassword && (
                <Text style={[styles.menuMeta, { color: colors.muted }]}>Доступно только в аккаунте</Text>
              )}
            </View>
            <ChevronRight color={colors.muted} size={18} />
          </TouchableOpacity>
        </View>

        {/* Прочее */}
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>ПРОЧЕЕ</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
            onPress={() => navigation.navigate('Achievements' as never)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: colors.primaryDim }]}>
              <Trophy color={colors.primary} size={17} />
            </View>
            <Text style={[styles.menuText, { color: colors.text }]}>Достижения</Text>
            <ChevronRight color={colors.muted} size={18} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
            onPress={() =>
              showToast('Уведомления скоро появятся', 'info')
            }
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: colors.primaryDim }]}>
              <Bell color={colors.primary} size={17} />
            </View>
            <Text style={[styles.menuText, { color: colors.text }]}>Уведомления</Text>
            <ChevronRight color={colors.muted} size={18} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => Alert.alert('О приложении', 'SmartWord v1.0.0\nУмный словарь с AI-ассистентом.')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: colors.primaryDim }]}>
              <Info color={colors.primary} size={17} />
            </View>
            <Text style={[styles.menuText, { color: colors.text }]}>О приложении</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.menuMeta, { color: colors.muted }]}>v1.0.0</Text>
              <ChevronRight color={colors.muted} size={18} />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Модальное окно смены пароля */}
      <Modal visible={passwordModalVisible} transparent animationType="slide" onRequestClose={handleCloseModal}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={handleCloseModal} />
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

            <Text style={[styles.modalTitle, { color: colors.text }]}>Изменить пароль</Text>

            {step === 'current' ? (
              <>
                <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
                  Сначала подтвердите текущий пароль
                </Text>

                <View style={[styles.inputWrap, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
                  <Lock color={colors.muted} size={16} />
                  <TextInput
                    style={[styles.inputField, { color: colors.text }]}
                    placeholder="Текущий пароль"
                    placeholderTextColor={colors.muted}
                    secureTextEntry={!showCurrent}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleVerifyCurrentPassword}
                  />
                  <TouchableOpacity onPress={() => setShowCurrent((v) => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    {showCurrent ? <EyeOff color={colors.muted} size={16} /> : <Eye color={colors.muted} size={16} />}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.primary, opacity: verifying ? 0.7 : 1 }]}
                  onPress={handleVerifyCurrentPassword}
                  disabled={verifying}
                  activeOpacity={0.85}
                >
                  {verifying ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <Text style={styles.modalBtnText}>Подтвердить</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
                  Придумайте надёжный новый пароль
                </Text>

                <View style={[styles.inputWrap, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
                  <Lock color={colors.muted} size={16} />
                  <TextInput
                    style={[styles.inputField, { color: colors.text }]}
                    placeholder="Новый пароль (мин. 6 символов)"
                    placeholderTextColor={colors.muted}
                    secureTextEntry={!showNew}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    autoFocus
                  />
                  <TouchableOpacity onPress={() => setShowNew((v) => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    {showNew ? <EyeOff color={colors.muted} size={16} /> : <Eye color={colors.muted} size={16} />}
                  </TouchableOpacity>
                </View>

                <View style={[styles.inputWrap, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
                  <Lock color={colors.muted} size={16} />
                  <TextInput
                    style={[styles.inputField, { color: colors.text }]}
                    placeholder="Повторите новый пароль"
                    placeholderTextColor={colors.muted}
                    secureTextEntry={!showConfirm}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleChangePassword}
                  />
                  <TouchableOpacity onPress={() => setShowConfirm((v) => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    {showConfirm ? <EyeOff color={colors.muted} size={16} /> : <Eye color={colors.muted} size={16} />}
                  </TouchableOpacity>
                </View>

                {/* Индикатор силы пароля */}
                {newPassword.length > 0 && (
                  <View style={styles.strengthRow}>
                    {[1, 2, 3, 4].map((i) => {
                      const strength = newPassword.length >= 12 ? 4 : newPassword.length >= 8 ? 3 : newPassword.length >= 6 ? 2 : 1;
                      const filled = i <= strength;
                      const color = strength === 1 ? colors.danger : strength === 2 ? '#F59E0B' : strength === 3 ? '#60A5FA' : colors.success;
                      return (
                        <View
                          key={i}
                          style={[styles.strengthBar, { backgroundColor: filled ? color : colors.elevated }]}
                        />
                      );
                    })}
                    <Text style={[styles.strengthLabel, { color: colors.muted }]}>
                      {newPassword.length < 6 ? 'Слабый' : newPassword.length < 8 ? 'Нормальный' : newPassword.length < 12 ? 'Хороший' : 'Сильный'}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.primary, opacity: changingPassword ? 0.7 : 1 }]}
                  onPress={handleChangePassword}
                  disabled={changingPassword}
                  activeOpacity={0.85}
                >
                  {changingPassword ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <Text style={styles.modalBtnText}>Сохранить пароль</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={styles.modalCancelBtn} onPress={handleCloseModal} activeOpacity={0.7}>
              <Text style={[styles.modalCancelText, { color: colors.muted }]}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    width: 40, height: 40, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: typography.subtitle, fontFamily: fonts.headingBold },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.sm },
  sectionLabel: {
    fontSize: typography.xs, fontFamily: fonts.bold, letterSpacing: 1.2,
    marginTop: spacing.sm, marginLeft: spacing.xs, marginBottom: 2,
  },
  card: { borderRadius: radii.md, borderWidth: 1, overflow: 'hidden' },
  themeRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md },
  menuRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md },
  menuIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  menuText: { fontSize: typography.body, fontFamily: fonts.medium },
  menuMeta: { fontSize: typography.small, fontFamily: fonts.regular },
  checkCircle: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  modalSheet: {
    borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg,
    borderWidth: 1, padding: spacing.lg, gap: spacing.md,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.xs },
  modalTitle: { fontSize: typography.subtitle, fontFamily: fonts.headingBold, textAlign: 'center' },
  modalSubtitle: { fontSize: typography.small, textAlign: 'center', marginBottom: spacing.xs },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderRadius: radii.sm, borderWidth: 1,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
  },
  inputField: { flex: 1, fontSize: typography.body, fontFamily: fonts.regular },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  strengthBar: { flex: 1, height: 3, borderRadius: 2 },
  strengthLabel: { fontSize: typography.xs, marginLeft: spacing.xs },
  modalBtn: { borderRadius: radii.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.xs },
  modalBtnText: { fontSize: typography.body, fontFamily: fonts.bold, color: '#000' },
  modalCancelBtn: { alignItems: 'center', padding: spacing.sm },
  modalCancelText: { fontSize: typography.small, fontFamily: fonts.regular },
});
