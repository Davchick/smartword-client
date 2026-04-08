import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from './Skeleton';
import { SkeletonCard } from './SkeletonCard';
import { useTheme, spacing, radii } from '../../theme';

type SkeletonScreenType = 'list' | 'profile' | 'detail' | 'training';

type Props = {
  /** Тип экрана для предопределённой раскладки */
  type: SkeletonScreenType;
  /** Количество карточек-заглушек (для list/detail/training) */
  count?: number;
  /** Показывать stats-баннер (для list/profile) */
  showStats?: boolean;
  /** Показывать заголовок экрана */
  showHeader?: boolean;
};

/**
 * SkeletonScreen — fullscreen контейнер skeleton-загрузкой.
 * Заменяет полноэкранные ActivityIndicator спиннеры.
 */
export const SkeletonScreen = ({
  type,
  count = 3,
  showStats = false,
  showHeader = true,
}: Props) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const renderHeader = () => {
    if (!showHeader) return null;
    return (
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Skeleton width={24} height={24} borderRadius={12} />
        <View style={styles.headerTitleBlock}>
          <Skeleton width={120} height={22} />
          <Skeleton width={80} height={13} style={{ marginTop: 4 }} />
        </View>
      </View>
    );
  };

  const renderStatsBanner = () => {
    if (!showStats) return null;
    return (
      <View style={[styles.statsBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {Array.from({ length: 3 }).map((_, i) => (
          <React.Fragment key={i}>
            {i > 0 && <View style={[styles.statDivider, { backgroundColor: colors.border }]} />}
            <View style={styles.statItem}>
              <Skeleton width={38} height={38} borderRadius={19} />
              <Skeleton width={40} height={18} style={{ marginTop: 6 }} />
              <Skeleton width={50} height={11} style={{ marginTop: 4 }} />
            </View>
          </React.Fragment>
        ))}
      </View>
    );
  };

  const renderStatsWidget = () => {
    if (!showStats) return null;
    if (type !== 'list') return null;
    return (
      <View style={[styles.statsWidget, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Skeleton width="90%" height={16} style={{ alignSelf: 'center' }} />
        <View style={styles.statsRow}>
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={i} style={styles.statCard}>
              <Skeleton width={28} height={28} borderRadius={14} />
              <Skeleton width={36} height={16} style={{ marginTop: 6 }} />
              <Skeleton width={50} height={11} style={{ marginTop: 4 }} />
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderListContent = () => (
    <>
      {renderStatsWidget()}
      <View style={styles.listContent}>
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard
            key={i}
            titleLines={1}
            showSubtitle
            contentRows={0}
            style={i > 0 && { marginTop: 0 }}
          />
        ))}
      </View>
    </>
  );

  const renderDetailContent = () => (
    <View style={styles.listContent}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard
          key={i}
          titleLines={2}
          showIcon={false}
          showBadge={false}
          contentRows={0}
        />
      ))}
    </View>
  );

  const renderProfileContent = () => (
    <View style={styles.profileContent}>
      <View style={styles.profileHeader}>
        <Skeleton width={80} height={80} borderRadius={40} />
        <View style={styles.profileInfo}>
          <Skeleton width={140} height={20} />
          <Skeleton width={100} height={14} style={{ marginTop: 6 }} />
        </View>
      </View>
      {renderStatsBanner()}
      <View style={styles.profileStats}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={[styles.profileStat, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Skeleton width={32} height={32} borderRadius={16} />
            <Skeleton width={40} height={20} style={{ marginTop: 8 }} />
            <Skeleton width={60} height={11} style={{ marginTop: 4 }} />
          </View>
        ))}
      </View>
    </View>
  );

  const renderTrainingContent = () => (
    <View style={styles.trainingContent}>
      <View style={styles.wordCard}>
        <Skeleton width={180} height={32} style={{ alignSelf: 'center' }} />
        <Skeleton width={120} height={20} style={{ alignSelf: 'center', marginTop: 12 }} />
      </View>
      <View style={styles.actionButtons}>
        <Skeleton width="48%" height={52} borderRadius={radii.md} />
        <Skeleton width="48%" height={52} borderRadius={radii.md} />
      </View>
    </View>
  );

  const renderContent = () => {
    switch (type) {
      case 'list':
        return renderListContent();
      case 'detail':
        return renderDetailContent();
      case 'profile':
        return renderProfileContent();
      case 'training':
        return renderTrainingContent();
      default:
        return renderListContent();
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: colors.background },
      ]}
    >
      {renderHeader()}
      {renderStatsBanner()}
      <ScrollView
        style={styles.scroll}
        scrollEnabled={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderContent()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  headerTitleBlock: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  statsWidget: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    gap: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  statsBanner: {
    flexDirection: 'row',
    borderRadius: radii.md,
    borderWidth: 1,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  profileContent: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  profileStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  profileStat: {
    width: '48%',
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: 'center',
  },
  trainingContent: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.xl,
    justifyContent: 'center',
  },
  wordCard: {
    padding: spacing.xl,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
