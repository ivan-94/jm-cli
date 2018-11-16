/**
 * 生产环境配置
 */
import { WebpackConfigurer } from './type'
const DuplicatePackageCheckerPlugin = require('duplicate-package-checker-webpack-plugin')
const CircularDependencyPlugin = require('circular-dependency-plugin')

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
      // 检查是否存在多个版本的包
      argv.jmOptions.enableDuplicatePackageCheck &&
        new DuplicatePackageCheckerPlugin({
          verbose: true,
          showHelp: true,
        }),
      // 循环依赖检查
      argv.jmOptions.enableCircularDependencyCheck &&
        new CircularDependencyPlugin({
          exclude: /a\.js|node_modules/, // exclude node_modules
          failOnError: false, // show a warning when there is a circular dependency
        }),
    ].filter(Boolean),
    optimization: {
      // 定义拆包规则
      // 按照默认配置, webpack会自动拆分符合下列条件(AND)的chunks
      // * 新的chunk可以被共享或者模块来自于node_modules(minChunks)
      // * 新的chunk大于30kb(minSize)
      // * 按需模块并行请求(即import数)的最大次数 <= 5(maxAsyncRequests)
      // * 初始模块并行请求的最大次数 <= 5(maxInitialRequests)
      // 详见 https://webpack.docschina.org/plugins/split-chunks-plugin/
      splitChunks: {
        // cacheGroups用于扩展或覆盖splitChunks.*. 即扩展默认规则
        // 由于支持多页应用, 所以我们会对初始chunk进行命名, 以便可以在html-webpack-plugin中对这些chunk进行注入
        cacheGroups: {
          // 第三方共有包
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            reuseExistingChunk: false,
            chunks: 'initial',
            minChunks: 2,
            // 一个可拆分的chunk可能属于多个分组, 这个用于设置优先级
            priority: -10,
          },
          // 应用内共有包
          commons: {
            test: /src/,
            chunks: 'initial',
            reuseExistingChunk: true,
            minChunks: 2,
            priority: -20,
          },
        },
      },
      // Keep the runtime chunk seperated to enable long term caching
      runtimeChunk: {
        name: 'runtime',
      },
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
