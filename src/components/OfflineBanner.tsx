/**
 * OfflineBanner — показывает баннер при отсутствии сети.
 * Размещается на верхнем уровне навигации.
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export const OfflineBanner = () => {
  const { isOffline } = useNetworkStatus();
  const translateY = React.useRef(new Animated.Value(-50)).current;

  React.useEffect(() => {
    Animated.spring(translateY, {
      toValue: isOffline ? 0 : -50,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  }, [isOffline, translateY]);

  if (!isOffline) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY }] },
      ]}
      pointerEvents="none"
      accessibilityRole="alert"
      accessibilityLabel="Нет подключения к интернету"
    >
      <WifiOff color="#FFF" size={16} />
      <Text style={styles.text}>Нет подключения к интернету</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  text: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
