import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ExternalLink, FileText, Shield, Scale } from 'lucide-react-native';
import { useTheme, spacing, radii, typography, fonts } from '../../theme';
import { Button } from '../../components/ui/Button';

const LEGAL_DOCS = {
  privacyPolicy: {
    title: 'Политика конфиденциальности',
    description: 'Как мы обрабатываем ваши персональные данные',
    icon: Shield,
    url: 'https://smart-word.ru/privacy', // TODO: Заменить на актуальный URL
  },
  termsOfService: {
    title: 'Пользовательское соглашение',
    description: 'Публичная оферта на оказание услуг',
    icon: Scale,
    url: 'https://smart-word.ru/terms', // TODO: Заменить на актуальный URL
  },
};

const APP_INFO = {
  version: '1.0.0',
  build: '1',
};

interface LegalScreenProps {
  navigation: any;
}

export const LegalScreen = ({ navigation }: LegalScreenProps) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const handleOpenDocument = async (docKey: keyof typeof LEGAL_DOCS) => {
    const doc = LEGAL_DOCS[docKey];
    try {
      // TODO: Для production - открыть WebView с локальным документом или URL
      // Для сейчас - показать alert с инструкцией
      alert(
        `${doc.title}\n\n` +
        `Документ находится в разработке.\n\n` +
        `Для просмотра откройте:\n${doc.url}\n\n` +
        `Или перейдите в настройки профиля.`
      );
    } catch (error) {
      console.error('Error opening document:', error);
    }
  };

  const handleOpenURL = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        alert(`Не удалось открыть ссылку: ${url}`);
      }
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  };

  const handleContactSupport = () => {
    handleOpenURL('mailto:support@smartword.app');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md, backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft color={colors.text} size={20} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Правовая информация</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Документы */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Документы</Text>
          <Text style={[styles.sectionHint, { color: colors.muted }]}>
            Официальные документы приложения SmartWord
          </Text>

          <View style={styles.cards}>
            {(Object.keys(LEGAL_DOCS) as Array<keyof typeof LEGAL_DOCS>).map((key) => {
              const doc = LEGAL_DOCS[key];
              const Icon = doc.icon;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handleOpenDocument(key)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.cardIcon, { backgroundColor: colors.primary }]}>
                    <Icon color="#000" size={24} />
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{doc.title}</Text>
                    <Text style={[styles.cardDesc, { color: colors.muted }]}>{doc.description}</Text>
                  </View>
                  <ExternalLink color={colors.muted} size={18} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Информация о приложении */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>О приложении</Text>
          
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>Версия</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>v{APP_INFO.version} ({APP_INFO.build})</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>Разработчик</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>ИП [ФИО]</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>ИНН</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>[ИНН]</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>ОГРНИП</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>[ОГРНИП]</Text>
            </View>
          </View>
        </View>

        {/* Контакты */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Контакты</Text>
          
          <View style={styles.cards}>
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={handleContactSupport}
              activeOpacity={0.7}
            >
              <View style={[styles.cardIcon, { backgroundColor: '#34C759' }]}>
                <FileText color="#000" size={24} />
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Служба поддержки</Text>
                <Text style={[styles.cardDesc, { color: colors.muted }]}>support@smartword.app</Text>
              </View>
              <ExternalLink color={colors.muted} size={18} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => handleOpenURL('https://rkn.gov.ru/treatments/')}
              activeOpacity={0.7}
            >
              <View style={[styles.cardIcon, { backgroundColor: '#FF9500' }]}>
                <Shield color="#000" size={24} />
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Роскомнадзор</Text>
                <Text style={[styles.cardDesc, { color: colors.muted }]}>Подать жалобу</Text>
              </View>
              <ExternalLink color={colors.muted} size={18} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Compliance информация */}
        <View style={[styles.complianceBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.complianceTitle, { color: colors.text }]}>
            📋 Соответствие законодательству
          </Text>
          <Text style={[styles.complianceText, { color: colors.muted }]}>
            Приложение соответствует требованиям:
          </Text>
          <View style={styles.complianceList}>
            <Text style={[styles.complianceItem, { color: colors.text }]}>
              • 152-ФЗ «О персональных данных»
            </Text>
            <Text style={[styles.complianceItem, { color: colors.text }]}>
              • 149-ФЗ «Об информации»
            </Text>
            <Text style={[styles.complianceItem, { color: colors.text }]}>
              • Закон «О защите прав потребителей»
            </Text>
          </View>
        </View>

        <View style={{ height: insets.bottom + spacing.xl }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.title,
    fontFamily: fonts.headingBold,
  },
  headerPlaceholder: {
    width: 40,
  },
  scroll: { flex: 1 },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.body,
    fontFamily: fonts.headingBold,
  },
  sectionHint: {
    fontSize: typography.small,
    fontFamily: fonts.regular,
  },
  cards: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: typography.small,
    fontFamily: fonts.bold,
  },
  cardDesc: {
    fontSize: typography.xs,
    fontFamily: fonts.regular,
  },
  infoCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: typography.small,
    fontFamily: fonts.regular,
  },
  infoValue: {
    fontSize: typography.small,
    fontFamily: fonts.medium,
  },
  complianceBlock: {
    margin: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  complianceTitle: {
    fontSize: typography.body,
    fontFamily: fonts.headingBold,
  },
  complianceText: {
    fontSize: typography.small,
    fontFamily: fonts.regular,
  },
  complianceList: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  complianceItem: {
    fontSize: typography.small,
    fontFamily: fonts.regular,
  },
});
