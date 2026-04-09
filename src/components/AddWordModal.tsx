import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme, spacing, radii, typography } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (original: string, translation: string) => Promise<{ error: string | null }>;
  totalCount: number;
  isPremium: boolean;
}

export const AddWordModal = ({ visible, onClose, onSubmit, totalCount, isPremium }: Props) => {
  const { colors } = useTheme();
  const [original, setOriginal] = useState('');
  const [translation, setTranslation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDisabled = !original.trim() || !translation.trim() || loading;

  const handleSubmit = async () => {
    if (isDisabled) return;
    setLoading(true);
    setError(null);
    const result = await onSubmit(original.trim(), translation.trim());
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setOriginal('');
      setTranslation('');
      onClose();
    }
  };

  const handleClose = () => {
    setOriginal('');
    setTranslation('');
    setError(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior="padding"
        >
          <View style={[styles.sheet, { backgroundColor: colors.elevated }]} onStartShouldSetResponder={() => true}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>Новое слово</Text>
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X color={colors.muted} size={22} />
              </TouchableOpacity>
            </View>

          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="Слово"
            placeholderTextColor={colors.muted}
            value={original}
            onChangeText={setOriginal}
            autoFocus
            returnKeyType="next"
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="Перевод"
            placeholderTextColor={colors.muted}
            value={translation}
            onChangeText={setTranslation}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          {error && <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }, isDisabled && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isDisabled}
            activeOpacity={0.8}
          >
            <Text style={[styles.buttonText, { color: colors.background }]}>{loading ? 'Добавление...' : 'Добавить'}</Text>
          </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl + spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.subtitle,
    fontWeight: '700',
  },
  counter: {
    fontSize: typography.small,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  counterWarning: {
    // color applied inline
  },
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    fontSize: typography.body,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: typography.small,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  button: {
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: typography.body,
    fontWeight: '700',
  },
});
