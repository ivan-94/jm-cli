/**
 * electron 主线程
 */
import webpack, { Configuration } from 'webpack'
import { WebpackConfigurer } from './type'
import getBabelOptions from './utils/babelOptions'
import getTslintConfig from './utils/tslintConfig'
import genCacheConfig from './utils/cacheOptions'
import terserPluginOptions from './utils/terserPluginOptions'

const TerserPlugin = require('terser-webpack-plugin')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const WriteFilePlugin = require('write-file-webpack-plugin')

const configure: WebpackConfigurer = (environments, pkg, paths, argv) => {
  const isProduction = environments.raw.NODE_ENV === 'production'
  const $ = <D, P>(development: D, production: P) => (isProduction ? production : development)
  const context = paths.appElectronMain
  const shouldUseSourceMap = environments.raw.SOURCE_MAP !== 'false'

  const babelOptions = {
    ...getBabelOptions(environments.raw.NODE_ENV, argv.jmOptions, true),
    envName: environments.raw.NODE_ENV,
  }

  const babelLoders = [
    // should I use cache-loader here? see more in https://github.com/webpack-contrib/cache-loader/issues/1#issuecomment-297994952
    {
      loader: require.resolve('cache-loader'),
      options: genCacheConfig('babel-electron-main', environments.raw, paths),
    },
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
      pathinfo: !isProduction,
      filename: 'main.js',
      libraryTarget: 'commonjs2',
    },
    externals: [...Object.keys(pkg.dependencies || {})],
    resolve: {
      modules: ['node_modules'],
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      alias: {
        ...(argv.jmOptions.alias || {}),
        // 可以直接使用~访问相对于源代码目录的模块，优化查找效率
        // 如 ~/components/Button
        '~': context,
        share: paths.appElectronShare,
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
          use: babelLoders,
        },
      ],
    },
    optimization: {
      minimize: isProduction,
      minimizer: [new TerserPlugin(terserPluginOptions(shouldUseSourceMap))],
    },
    plugins: [
      !isProduction && new WriteFilePlugin(),
      new ForkTsCheckerWebpackPlugin({
        tsconfig: paths.appTsConfig,
        tslint: getTslintConfig(paths.appTsLintConfig, environments.raw),
        watch: paths.appElectronMain,
        reportFiles: [`**/*.{ts,tsx}`],
        // 配合webpack-dev-server使用
        async: false,
        silent: true,
        // 配合ts-loader的happyPackMode使用, 即由当前组件全权处理Typescript文件的检查(语法和语义(默认))
        checkSyntacticErrors: true,
        formatter: 'codeframe',
      }),
      // FIXME: no workd
      new webpack.DefinePlugin(environments.stringified),
    ].filter(Boolean),
    node: false,
  }

  return webpackConfig
}

export default configure
