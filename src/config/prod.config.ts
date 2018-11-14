/**
 * 生产环境配置
 */
import { WebpackConfigurer } from './type'

const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const safePostCssParser = require('postcss-safe-parser')
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin')

const configure: WebpackConfigurer = (enviroments, pkg, paths, argv) => {
  const { name } = argv
  const filePrefix = name ? `${name}_` : ''
  const shouldUseSourceMap = enviroments.raw.SOURCE_MAP !== 'false'

  return {
    devtool: shouldUseSourceMap && 'source-map',
    bail: true,
    entry: {},
    module: {
      rules: [],
    },
    plugins: [
      // 抽取CSS文件
      new MiniCssExtractPlugin({
        filename: `static/css/${filePrefix}[name].css?[contenthash:8]`,
        chunkFilename: `static/css/${filePrefix}[name].chunk.css?[contenthash:8]`,
      }),
    ],
    optimization: {
      // 让webpack检查和删除已经在所有父模块存在的模块
      removeAvailableModules: true,
      // 删除空模块
      removeEmptyChunks: true,
      // 合并重复的模块
      mergeDuplicateChunks: true,
      minimize: true,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            parse: {
              // we want terser to parse ecma 8 code. However, we don't want it
              // to apply any minfication steps that turns valid ecma 5 code
              // into invalid ecma 5 code. This is why the 'compress' and 'output'
              // sections only apply transformations that are ecma 5 safe
              // https://github.com/facebook/create-react-app/pull/4234
              ecma: 8,
            },
            compress: {
              ecma: 5,
              warnings: false,
              // Disabled because of an issue with Uglify breaking seemingly valid code:
              // https://github.com/facebook/create-react-app/issues/2376
              // Pending further investigation:
              // https://github.com/mishoo/UglifyJS2/issues/2011
              comparisons: false,
              // Disabled because of an issue with Terser breaking valid code:
              // https://github.com/facebook/create-react-app/issues/5250
              // Pending futher investigation:
              // https://github.com/terser-js/terser/issues/120
              inline: 2,
            },
            mangle: {
              safari10: true,
            },
            output: {
              ecma: 5,
              comments: false,
              // Turned on because emoji and regex is not minified properly using default
              // https://github.com/facebook/create-react-app/issues/2488
              ascii_only: true,
            },
          },
          // Use multi-process parallel running to improve the build speed
          // Default number of concurrent runs: os.cpus().length - 1
          parallel: true,
          // Enable file caching
          cache: true,
          sourceMap: shouldUseSourceMap,
        }),
        new OptimizeCSSAssetsPlugin({
          cssProcessorOptions: {
            parser: safePostCssParser,
            map: shouldUseSourceMap
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
        }),
      ],
    },
    performance: {
      hints: 'warning',
      assetFilter: assetFilename => !/(\.map$)|(^(vendor\.|favicon\.))/.test(assetFilename),
    },
  }
}

export default configure
