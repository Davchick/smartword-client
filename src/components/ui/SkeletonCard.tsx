import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from './Skeleton';
import { useTheme, spacing, radii } from '../../theme';

type Props = {
  /** Количество строк заголовка (default: 1) */
  titleLines?: number;
  /** Показывать подзаголовок */
  showSubtitle?: boolean;
  /** Показывать бейдж справа */
  showBadge?: boolean;
  /** Показывать иконку слева */
  showIcon?: boolean;
  /** Дополнительные строки контента */
  contentRows?: number;
  style?: any;
};

/**
 * Skeleton-карточка — имитирует карточку списка/словаря/группы.
 */
export const SkeletonCard = ({
  titleLines = 1,
  showSubtitle = false,
  showBadge = false,
  showIcon = true,
  contentRows = 0,
  style,
}: Props) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        style,
      ]}
    >
      <View style={styles.header}>
        {showIcon && <Skeleton width={32} height={32} borderRadius={radii.sm} />}
        <View style={styles.titleBlock}>
          {Array.from({ length: titleLines }).map((_, i) => (
            <Skeleton
              key={i}
              width={i === titleLines - 1 ? '85%' : '60%'}
              height={16}
              style={i > 0 ? { marginTop: 6 } : undefined}
            />
          ))}
          {showSubtitle && (
            <Skeleton width="45%" height={12} style={{ marginTop: 6 }} />
          )}
        </View>
        {showBadge && <Skeleton width={36} height={24} borderRadius={radii.full} />}
      </View>

      {contentRows > 0 && (
        <View style={styles.content}>
          {Array.from({ length: contentRows }).map((_, i) => (
            <View key={i} style={styles.row}>
              <View style={styles.rowTexts}>
                <Skeleton width="40%" height={12} />
                <Skeleton width="65%" height={16} style={{ marginTop: 4 }} />
              </View>
              <Skeleton width={30} height={6} borderRadius={3} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleBlock: {
    flex: 1,
  },
  content: {
    marginTop: 12,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowTexts: {
    flex: 1,
  },
});
