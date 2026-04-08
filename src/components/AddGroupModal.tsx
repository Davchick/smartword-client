import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme, spacing, radii, typography } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (name: string, language: string) => Promise<void>;
}

export const AddGroupModal = ({ visible, onClose, onSubmit }: Props) => {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onSubmit(name.trim(), '');
      setName('');
      onClose();
    } catch (err: unknown) {
      const e = err as { body?: { error?: string } };
      setError(e?.body?.error ?? 'Не удалось создать словарь');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]} onPress={handleClose}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View 
            style={[styles.sheet, { backgroundColor: colors.elevated }]}
            onStartShouldSetResponder={() => true}
          >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Новый словарь</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X color={colors.muted} size={22} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="Название"
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={(text) => { setName(text); setError(null); }}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          {error && <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }, (!name.trim() || loading) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading || !name.trim()}
            activeOpacity={0.8}
          >
            <Text style={[styles.buttonText, { color: colors.background }]}>{loading ? 'Создание...' : 'Создать'}</Text>
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
