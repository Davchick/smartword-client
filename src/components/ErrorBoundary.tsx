import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
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
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.emoji}>😵</Text>
            <Text style={styles.title}>Что-то пошло не так</Text>
            <Text style={styles.subtitle}>
              Произошла непредвиденная ошибка. Попробуйте перезапустить приложение.
            </Text>
            {this.state.error && (
              <View style={styles.errorBlock}>
                <Text style={styles.errorTitle}>Детали ошибки:</Text>
                <Text style={styles.errorText} selectable>
                  {this.state.error.message}
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.resetButton} onPress={this.handleReset} activeOpacity={0.8}>
              <Text style={styles.resetButtonText}>Попробовать снова</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
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
    color: '#F1F5F9',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
  },
  errorBlock: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F43F5E',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#CBD5E1',
    fontFamily: 'monospace',
  },
  resetButton: {
    backgroundColor: '#38BDF8',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 16,
  },
  resetButtonText: {
    color: '#020617',
    fontSize: 16,
    fontWeight: '700',
  },
});
