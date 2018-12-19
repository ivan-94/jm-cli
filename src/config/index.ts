/**
 * 基础配置
 */
import webpack, { Configuration } from 'webpack'
import path from 'path'
import chalk from 'chalk'
import { WebpackConfigurer } from './type'
import devConfig from './dev.config'
import prodConfig from './prod.config'
import getBabelOptions from './utils/babelOptions'
import genCacheConfig from './utils/cacheOptions'
import styleLoaders from './utils/styleLoaders'
import { getEntries, genTemplatePlugin } from './utils/entry'
import getTslintConfig from './utils/tslintConfig'
import InjectEnvPlugin from './plugins/HtmlInjectedEnvironments'
import HtmlInterpolatePlugin from './plugins/HtmlInterpolate'
import WatchMissingNodeModulesPlugin from './plugins/WatchMissingNodeModulesPlugin'

const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const HappyPack = require('happypack')

const configure: WebpackConfigurer = (enviroments, pkg, paths, argv) => {
  const { name, entry } = argv
  const isProduction = enviroments.raw.NODE_ENV === 'production'
  const $ = <D, P>(development: D, production: P) => (isProduction ? production : development)

  const envConfig = $(devConfig, prodConfig)(enviroments, pkg, paths, argv)
  const context = paths.appSrc
  const pageExt = ensurePageExt(enviroments.raw.PAGE_EXT || '.html')
  const pageEntries = getEntries(context, pageExt, entry, isProduction)
  const filePrefix = name ? `${name}_` : ''
  const shouldUseSourceMap = enviroments.raw.SOURCE_MAP !== 'false'

  if (Object.keys(pageEntries).length === 0) {
    console.log(`Not pages(*${pageExt}) existed in ${chalk.blue(context)}`)
    process.exit()
  }

  const entries = {
    // inject entries
    ...(envConfig.entry as object),
    ...pageEntries,
  }

  const babelOptions = {
    ...getBabelOptions(enviroments.raw.NODE_ENV, argv.jmOptions.importPlugin),
    envName: enviroments.raw.NODE_ENV,
  }

  const babelLoders = [
    // should I use cache-loader here? see more in https://github.com/webpack-contrib/cache-loader/issues/1#issuecomment-297994952
    {
      loader: require.resolve('cache-loader'),
      options: genCacheConfig('babel', enviroments.raw, paths),
    },
    {
      loader: require.resolve('babel-loader'),
      options: babelOptions,
    },
  ]

  const webpackConfig: Configuration = {
    name,
    bail: envConfig.bail,
    context,
    mode: $('development', 'production'),
    devtool: envConfig.devtool,
    entry: entries,
    output: {
      filename: `static/js/${filePrefix}[name].js${$('', '?[chunkhash:8]')}`,
      chunkFilename: `static/js/${filePrefix}[name].js${$('', '?[chunkhash:8]')}`,
      path: paths.appDist,
      pathinfo: !isProduction,
      publicPath: enviroments.raw.PUBLIC_URL,
      // Point sourcemap entries to original disk location (format as URL on Windows)
      devtoolModuleFilenameTemplate: isProduction
        ? info => path.relative(paths.appSrc, info.absoluteResourcePath).replace(/\\/g, '/')
        : info => path.resolve(info.absoluteResourcePath).replace(/\\/g, '/'),
    },
    resolve: {
      modules: ['node_modules'],
      extensions: ['.tsx', '.ts', '.js', '.jsx'],
      alias: {
        // 可以直接使用~访问相对于源代码目录的模块，优化查找效率
        // 如 ~/components/Button
        '~': context,
      },
    },
    resolveLoader: {
      modules: [paths.ownNodeModules, 'node_modules'],
    },
    module: {
      strictExportPresence: true,
      rules: [
        { parser: { requireEnsure: false } },
        {
          oneOf: [
            // typescript & js
            {
              test: /\.(ts|tsx|js|jsx)$/,
              include: paths.appSrc,
              use: argv.jmOptions.happypack
                ? { loader: require.resolve('happypack/loader'), options: { id: 'babel' } }
                : babelLoders,
            },
            {
              test: /\.css$/,
              use: [
                ...styleLoaders(
                  enviroments.raw,
                  {
                    importLoaders: 1,
                    sourceMap: isProduction && shouldUseSourceMap,
                  },
                  undefined,
                  [
                    {
                      loader: require.resolve('cache-loader'),
                      options: genCacheConfig('css', enviroments.raw, paths),
                    },
                  ],
                ),
              ],
              sideEffects: true,
            },
            // pug loader
            {
              test: /\.pug$/,
              use: [
                {
                  loader: require.resolve('cache-loader'),
                  options: genCacheConfig('pug', enviroments.raw, paths),
                },
                {
                  loader: require.resolve('pug-loader'),
                  options: {
                    root: context,
                  },
                },
              ],
            },
            // svg 可以获取链接，也可以转换为React组件
            {
              test: /\.svg$/,
              exclude: /fonts?/,
              use: [
                {
                  loader: require.resolve('cache-loader'),
                  options: genCacheConfig('svg', enviroments.raw, paths),
                },
                { loader: require.resolve('babel-loader'), options: babelOptions },
                {
                  loader: require.resolve('@svgr/webpack'),
                  options: {
                    icon: true,
                    svgo: true,
                    prettier: false,
                    babel: false,
                    svgProps: { fill: 'currentColor' },
                    expandProps: 'end',
                  },
                },
                {
                  loader: require.resolve('url-loader'),
                  options: {
                    limit: 10000,
                    name: `static/media/${filePrefix}[name].[ext]${$('', '?[hash:8]')}`,
                  },
                },
              ],
            },
            // images
            {
              test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
              loader: require.resolve('url-loader'),
              options: {
                limit: 10000,
                name: `static/media/${filePrefix}[name].[ext]${$('', '?[hash:8]')}`,
              },
            },
            // 其他loader插入到这里
            ...((envConfig.module && envConfig.module.rules) || []),
            {
              // Exclude `js` files to keep "css" loader working as it injects
              // its runtime that would otherwise be processed through "file" loader.
              // Also exclude `html` and `json` extensions so they get processed
              // by webpacks internal loaders.
              exclude: [/\.(ts|tsx|js|jsx|mjs)$/, /\.html$/, /\.json$/],
              loader: require.resolve('file-loader'),
              options: {
                name: `static/media/${filePrefix}[name].[ext]${$('', '?[hash:8]')}`,
              },
            },
          ],
        },
      ],
    },
    optimization: {
      ...(envConfig.optimization || {}),
    },
    plugins: [
      // typescript type checker
      new ForkTsCheckerWebpackPlugin({
        tsconfig: paths.appTsConfig,
        tslint: getTslintConfig(paths.appTsLintConfig, enviroments.raw),
        watch: paths.appSrc,
        // 配合webpack-dev-server使用
        async: false,
        silent: true,
        // 配合ts-loader的happyPackMode使用, 即由当前组件全权处理Typescript文件的检查(语法和语义(默认))
        checkSyntacticErrors: true,
        formatter: 'codeframe',
      }),
      // happypack
      ...(argv.jmOptions.happypack
        ? [
            new HappyPack({
              id: 'babel',
              loaders: babelLoders,
              verbose: false,
            }),
          ]
        : []),
      // 移除moment语言包
      new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
      new webpack.DefinePlugin(enviroments.stringified),
      // 监听丢失的模块. 如果没有这个插件, 一旦没有找到对应的模块, 将需要重启webpack.
      // 在使用link 模块时比较有用
      new WatchMissingNodeModulesPlugin(paths.appNodeModules),
      ...genTemplatePlugin(context, pageEntries, isProduction, enviroments.raw, pageExt),
      // 注入环境变量到 window.JM_ENV中
      new InjectEnvPlugin(enviroments.userDefine, 'JM_ENV'),
      // 当pageExt为html时, 解析里面的${ENV}
      ...(pageExt === '.html' ? [new HtmlInterpolatePlugin(enviroments.raw)] : []),
      ...(envConfig.plugins || []),
    ],
    node: {
      dgram: 'empty',
      fs: 'empty',
      net: 'empty',
      tls: 'empty',
      child_process: 'empty',
    },
    performance: envConfig.performance,
  }

  return webpackConfig
}

function ensurePageExt(ext: string) {
  ext = ext.trim()
  return ext[0] === '.' ? ext : `.${ext}`
}

export default configure
