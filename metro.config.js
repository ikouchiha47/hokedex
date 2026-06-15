const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);

const config = {
  resolver: {
    // Treat .sql files as source modules so Metro inlines them as raw strings.
    sourceExts: [...(defaultConfig.resolver?.sourceExts ?? []), 'sql'],
  },
  transformer: {
    // Custom transformer: .sql files are emitted as JS string modules, not parsed as JS.
    babelTransformerPath: require.resolve('./metro-sql-transformer'),
  },
};

module.exports = mergeConfig(defaultConfig, config);
