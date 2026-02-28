const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// На web заменяем нативные модули заглушками
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    if (moduleName === 'expo-haptics') {
      return {
        filePath: path.resolve(__dirname, 'src/mocks/expo-haptics.js'),
        type: 'sourceFile',
      };
    }
    if (moduleName === 'expo-in-app-purchases') {
      return {
        filePath: path.resolve(__dirname, 'src/mocks/expo-in-app-purchases.js'),
        type: 'sourceFile',
      };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
