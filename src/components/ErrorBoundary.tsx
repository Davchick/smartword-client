import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTheme, spacing, radii, typography } from '../theme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryInner extends Component<{ children: ReactNode; colors: Record<string, string> }, State> {
  constructor(props: { children: ReactNode; colors: Record<string, string> }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    const { colors } = this.props;
    if (this.state.hasError) {
      return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.emoji}>😵</Text>
            <Text style={[styles.title, { color: colors.text }]}>{'Что-то пошло не так'}</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Произошла непредвиденная ошибка. Попробуйте перезапустить приложение.
            </Text>
            {this.state.error && (
              <View style={[styles.errorBlock, { backgroundColor: colors.card }]}>
                <Text style={[styles.errorTitle, { color: colors.danger }]}>Детали ошибки:</Text>
                <Text style={[styles.errorText, { color: colors.textSecondary }]} selectable>
                  {this.state.error.message}
                </Text>
              </View>
            )}
            <TouchableOpacity style={[styles.resetButton, { backgroundColor: colors.primary }]} onPress={this.handleReset} activeOpacity={0.8}>
              <Text style={[styles.resetButtonText, { color: colors.background }]}>{'Попробовать снова'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

// Wrapper component that uses the hook
export const ErrorBoundary = ({ children }: Props) => {
  const { colors } = useTheme();
  return <ErrorBoundaryInner colors={colors}>{children}</ErrorBoundaryInner>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  content: {
    alignItems: 'center',
    gap: 16,
    paddingBottom: 40,
  },
  emoji: {
    fontSize: 64,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorBlock: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'monospace',
  },
  resetButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 16,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
