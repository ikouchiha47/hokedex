// Transforms .sql files into JS modules that export the raw SQL string.
// Metro inlines .sql at bundle time; Jest needs this transform instead.
module.exports = {
  process(src) {
    return { code: `module.exports = ${JSON.stringify(src)};` };
  },
};
