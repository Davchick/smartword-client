import React from 'react';
import { TextInput, StyleSheet, TextInputProps, View } from 'react-native';
import { useTheme, spacing, typography, fonts, radii } from '../../theme';

type Props = TextInputProps & {
  error?: string | null;
};

export const GlassInput: React.FC<Props> = ({ error, style, ...rest }) => {
  const { colors } = useTheme();
  const borderColor = error ? colors.danger : colors.border;

  return (
    <View style={styles.wrapper}>
      <TextInput
        style={[
          styles.input,
          {
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor,
            color: colors.text,
            backgroundColor: colors.card,
          },
          style,
        ]}
        placeholderTextColor={colors.muted}
        {...rest}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.body,
    fontFamily: fonts.regular,
  },
});

