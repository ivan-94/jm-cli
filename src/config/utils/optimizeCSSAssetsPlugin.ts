const safePostCssParser = require('postcss-safe-parser')

export default function optimizeCSSAssetsPlugin(sourceMapEnabled: boolean) {
  return {
    cssProcessorOptions: {
      parser: safePostCssParser,
      map: sourceMapEnabled
        ? {
            // `inline: false` forces the sourcemap to be output into a
            // separate file
            inline: false,
            // `annotation: true` appends the sourceMappingURL to the end of
            // the css file, helping the browser find the sourcemap
            annotation: true,
          }
        : false,
    },
  }
}
