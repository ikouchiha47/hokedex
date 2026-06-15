const { transform } = require('@react-native/metro-config');
const upstreamTransformer = require('@react-native/metro-babel-transformer');

module.exports.transform = async function sqlTransformer({ src, filename, options }) {
  if (filename.endsWith('.sql')) {
    const js = `module.exports = ${JSON.stringify(src)};`;
    return upstreamTransformer.transform({ src: js, filename, options });
  }
  return upstreamTransformer.transform({ src, filename, options });
};
