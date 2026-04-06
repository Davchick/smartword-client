const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Поддержка SVG через react-native-svg-transformer
config.transformer = {
  ...(config.transformer || {}),
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

config.resolver = {
  ...(config.resolver || {}),
  assetExts: (config.resolver.assetExts || []).filter((ext) => ext !== 'svg'),
  sourceExts: [...(config.resolver.sourceExts || []), 'svg'],
  // На web заменяем нативные модули заглушками
  resolveRequest: (context, moduleName, platform) => {
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
  },
};

module.exports = config;
