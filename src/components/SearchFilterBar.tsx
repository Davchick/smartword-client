import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Search, X, SlidersHorizontal } from 'lucide-react-native';
import { useTheme, spacing, radii, typography, fonts } from '../theme';

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchPlaceholder?: string;
  onSortPress?: () => void;
}

export const SearchFilterBar = ({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Поиск...',
  onSortPress,
}: SearchFilterBarProps) => {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <View style={styles.searchRow}>
        {/* Поле поиска */}
        <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
          <Search color={colors.muted} size={18} strokeWidth={2} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={searchPlaceholder}
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={onSearchChange}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => onSearchChange('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.clearBtn}
            >
              <X color={colors.muted} size={16} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>
        {/* Кнопка сортировки — отдельно справа */}
        {onSortPress && (
          <TouchableOpacity
            onPress={onSortPress}
            activeOpacity={0.7}
            style={[styles.sortBtn, { backgroundColor: colors.card }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <SlidersHorizontal color={colors.muted} size={20} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.body,
    fontFamily: fonts.regular,
    padding: 0,
  },
  clearBtn: {
    padding: spacing.xs,
  },
  sortBtn: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
