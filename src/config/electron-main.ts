/**
 * electron 主线程
 */
import webpack, { Configuration } from 'webpack'
import path from 'path'
import { WebpackConfigurer } from './type'
import getBabelOptions from './utils/babelOptions'
import terserPluginOptions from './utils/terserPluginOptions'
import getForkTsCheckerOptions from './utils/forkTsCheckerOption'
import genCacheConfig from './utils/cacheOptions'
import { ExternalWhiteList } from './constants'

const TerserPlugin = require('terser-webpack-plugin')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const WriteFilePlugin = require('write-file-webpack-plugin')
const nodeExternals = require('webpack-node-externals')

const configure: WebpackConfigurer = (environments, pkg, paths, argv) => {
  const isProduction = environments.raw.NODE_ENV === 'production'
  const $ = <D, P>(development: D, production: P) => (isProduction ? production : development)
  const context = paths.appSrc
  const shouldUseSourceMap = environments.raw.SOURCE_MAP !== 'false'

  const babelOptions = getBabelOptions(environments.raw, argv.jmOptions, paths, true)

  const babelLoders = [
    // should I use cache-loader here? see more in https://github.com/webpack-contrib/cache-loader/issues/1#issuecomment-297994952
    {
      loader: require.resolve('babel-loader'),
      options: babelOptions,
    },
  ]

  const webpackConfig: Configuration = {
    name: 'main',
    mode: $('development', 'production'),
    target: 'electron-main',
    devtool: shouldUseSourceMap && 'source-map',
    entry: paths.appElectronMain,
    context,
    output: {
      path: paths.appDist,
      pathinfo: true,
      filename: 'main.js',
      libraryTarget: 'commonjs2',
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    },
    externals: [
      nodeExternals({
        whitelist: [...(argv.jmOptions.electronExternalsWhitelist || []), ...ExternalWhiteList],
      }),
    ],
    resolve: {
      modules: ['node_modules'],
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      alias: {
        ...(argv.jmOptions.alias || {}),
        // 可以直接使用~访问相对于源代码目录的模块，优化查找效率
        // 如 ~/components/Button
        '~': context,
      },
    },
    resolveLoader: {
      modules: [paths.ownNodeModules, 'node_modules'],
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx|js|jsx)$/,
          include: paths.appPath,
          exclude: /node_modules/,
          use: [
            {
              loader: require.resolve('cache-loader'),
              options: genCacheConfig('babel-loader-main', environments.raw, paths),
            },
            ...babelLoders,
          ],
        },
      ],
    },
    optimization: {
      minimize: isProduction,
      minimizer: [new TerserPlugin(terserPluginOptions(shouldUseSourceMap))],
    },
    plugins: [
      !isProduction && new WriteFilePlugin(),
      !isProduction &&
        new ForkTsCheckerWebpackPlugin(
          getForkTsCheckerOptions(paths, environments.raw, {
            watch: paths.appElectronMain,
            reportFiles: [
              `${path.basename(paths.appElectronMain)}/**/*.@(ts|tsx)`,
              '!**/__tests__/**',
              '!**/?(*.)(spec|test).*',
            ],
          }),
        ),
      new webpack.DefinePlugin(environments.stringified),
    ].filter(Boolean),
    node: false,
  }

  return webpackConfig
}

export default configure
