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

const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const HappyPack = require('happypack')

const configure: WebpackConfigurer = (enviroments, pkg, paths, argv) => {
  const { name, entry } = argv
  const isProduction = enviroments.raw.NODE_ENV === 'production'
  const $ = <D, P>(development: D, production: P) => (isProduction ? production : development)

  const envConfig = $(devConfig, prodConfig)(enviroments, pkg, paths, argv)
  const context = paths.appSrc
  const pageExt = ensurePageExt(enviroments.raw.PAGE_EXT || '.html')
  const pageEntries = getEntries(context, pageExt, entry)
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
                {
                  loader: require.resolve('cache-loader'),
                  options: genCacheConfig('css', enviroments.raw, paths),
                },
                ...styleLoaders(enviroments.raw, {
                  importLoaders: 1,
                  sourceMap: isProduction && shouldUseSourceMap,
                }),
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
            name: 'vendor',
            test: /[\\/]node_modules[\\/]/,
            reuseExistingChunk: false,
            chunks: 'initial',
            minChunks: 2,
            enforce: true, // 强制
            // 一个可拆分的chunk可能属于多个分组, 这个用于设置优先级
            priority: -10,
          },
          // 应用内共有包
          commons: {
            name: 'commons',
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
