/**
 * 开发环境配置
 */
import webpack from 'webpack'
import { WebpackConfigurer } from './type'

const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin')
const DuplicatePackageCheckerPlugin = require('duplicate-package-checker-webpack-plugin')
const CircularDependencyPlugin = require('circular-dependency-plugin')

const configure: WebpackConfigurer = (enviroments, pkg, paths, argv) => ({
  entry: {
    main: [require.resolve('webpack-dev-server/client') + '?/', require.resolve('webpack/hot/dev-server')],
  },
  devtool:
    enviroments.raw.SOURCE_MAP === 'false'
      ? false
      : enviroments.raw.EVAL === 'true'
      ? 'cheap-module-eval-source-map'
      : 'cheap-module-source-map',
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          require.resolve('style-loader'),
          {
            loader: require.resolve('css-loader'),
            options: {
              importLoaders: 1,
            },
          },
          {
            loader: require.resolve('postcss-loader'),
            options: {
              ident: 'postcss',
              plugins: () => [
                require('autoprefixer')({
                  browsers: ['last 2 versions'],
                }),
              ],
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    // 在windows下大小写是不敏感的，这在其他端会导致问题
    new CaseSensitivePathsPlugin(),
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
    // 使用可读性更高的模块标识符， 在开发环境更容易debug, 取代NamedModulesPlugin
    // 默认在development环境下是开启的
    namedModules: true,
    namedChunks: true,
    noEmitOnErrors: true,
  },
})

export default configure
