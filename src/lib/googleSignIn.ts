/**
 * Условная загрузка Google Sign-In.
 * Модуль не работает в Expo Go (нет нативного кода) — загружаем только в dev/build.
 */
let Constants: typeof import('expo-constants').default | null = null;

try {
  Constants = require('expo-constants').default;
} catch {
  // expo-constants недоступен
}

const isExpoGo = Constants?.appOwnership === 'expo';

let GoogleSigninModule: typeof import('@react-native-google-signin/google-signin').GoogleSignin | null = null;

if (!isExpoGo) {
  try {
    GoogleSigninModule = require('@react-native-google-signin/google-signin').GoogleSignin;
  } catch {
    // Нативный модуль недоступен
  }
}

export const googleSignInAvailable = GoogleSigninModule !== null;
export const GoogleSignin = GoogleSigninModule;
