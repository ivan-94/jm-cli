/**
 * 基础配置
 */
import webpack, { Configuration } from 'webpack'
import fs from 'fs-extra'
import glob from 'glob'
import path from 'path'
import chalk from 'chalk'
import { WebpackConfigurer } from './type'
import devConfig from './dev.config'
import prodConfig from './prod.config'
import diff from 'lodash/difference'
import getBabelOptions from './babelOptions'
import styleLoaders from './styleLoaders'
import InjectEnvPlugin from './plugins/HtmlInjectedEnvironments'

const HtmlWebpackPlugin = require('html-webpack-plugin')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')

const configure: WebpackConfigurer = (enviroments, pkg, paths, argv) => {
  const { name, entry } = argv
  const isProduction = enviroments.raw.NODE_ENV === 'production'
  const $ = <D, P>(development: D, production: P) => (isProduction ? production : development)

  const envConfig = $(devConfig, prodConfig)(enviroments, pkg, paths, argv)
  const context = paths.appSrc
  const pageExt = enviroments.raw.PAGE_EXT || '.html'
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
            // typescript
            {
              test: /\.(ts|tsx|js|jsx)$/,
              include: paths.appSrc,
              use: {
                loader: require.resolve('babel-loader'),
                options: babelOptions,
              },
            },
            {
              test: /\.css$/,
              use: styleLoaders(enviroments.raw, {
                importLoaders: 1,
                sourceMap: isProduction && shouldUseSourceMap,
              }),
              sideEffects: true,
            },
            // pug loader
            {
              test: /\.pug$/,
              use: [
                require.resolve('cache-loader'),
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
      // 移除moment语言包
      new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
      new webpack.DefinePlugin(enviroments.stringified),
      ...genTemplatePlugin(context, pageEntries, isProduction, enviroments.raw, pageExt),
      // 注入环境变量到 window.JM_ENV中
      new InjectEnvPlugin(enviroments.userDefine, 'JM_ENV'),
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

function getEntries(context: string, pageExt: string, entry?: string[]) {
  const entries: { [name: string]: string } = {}

  let pages = scanPages(context, pageExt).map(p => path.basename(p, pageExt))
  if (entry && entry.length) {
    pages = pages.filter(p => entry.indexOf(p) !== -1)

    if (pages.length !== entry.length) {
      const notfoundedPages = diff(entry, pages).map(i => `${i}${pageExt}`)
      console.error(`${chalk.blue(notfoundedPages.join(', '))} not found in ${chalk.cyan(context)}`)
      process.exit(1)
    }
  }

  pages.forEach(page => {
    let entryFileExt = '.tsx'

    if (fs.existsSync(path.join(context, `${page}.tsx`))) {
      entryFileExt = '.tsx'
    } else if (fs.existsSync(path.join(context, `${page}.ts`))) {
      entryFileExt = '.ts'
    } else {
      console.error(
        `${chalk.green(
          `${page}${pageExt}`,
        )} founded, but not any entry file(${page}.tsx or ${page}.ts) found in ${context}.`,
      )
      process.exit(1)
    }

    // 检查入口文件是否存在
    const entry = `./${page}${entryFileExt}`
    entries[page] = entry
  })

  return entries
}

/**
 * scan enty pages
 */
function scanPages(context: string, ext: string) {
  return glob.sync(path.join(context, `*${ext}`), {})
}

// 生成*.html 文件
function genTemplatePlugin(
  context: string,
  pageEntries: { [key: string]: string },
  isProduction: boolean,
  templateParameters: { [key: string]: string },
  ext: string = '.html',
) {
  const pages = Object.keys(pageEntries)
  return pages.map(page => {
    const pagePath = path.join(context, `${page}${ext}`)

    return new HtmlWebpackPlugin({
      templateParameters,
      filename: page + '.html',
      inject: true,
      /**
       * HtmlWebpackPlugin 目前不支持多页应用parent chunks识别，所有这里只能限定
       * parent chunk的名称
       */
      chunks: ['main', 'runtime', 'polyfill', 'vendor', 'commons', page],
      template: pagePath,
      minify: isProduction
        ? {
            removeComments: true,
            collapseWhitespace: true,
            removeRedundantAttributes: true,
            useShortDoctype: true,
            removeEmptyAttributes: true,
            removeStyleLinkTypeAttributes: true,
            keepClosingSlash: true,
            minifyJS: true,
            minifyCSS: true,
            minifyURLs: true,
          }
        : undefined,
    })
  })
}

function getTslintConfig(configPath: string, enviroments: { [key: string]: string }) {
  if (enviroments.UNSAFE_DISABLE_TSLINT === 'true') {
    console.log(
      chalk.yellow(
        `⚠️ Warning: ${chalk.cyan('UNSAFE_DISABLE_TSLINT')} was turn on. Please follow the team development guidelines`,
      ),
    )
    return false
  }

  if (!fs.existsSync(configPath)) {
    // TODO:
    chalk.yellow(
      `⚠️ Warning: tslint not found in ${chalk.cyan(configPath)}. type ${chalk.blueBright(
        'jm create-tslint',
      )} to create one.`,
    )
    return false
  }

  return configPath
}

export default configure
