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
import babelOptions from './babelOptions'

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
      extensions: ['.tsx', '.ts', '.js'],
      alias: {
        // 可以直接使用~访问相对于源代码目录的模块，优化查找效率
        // 如 ~/components/Button
        '~': context,
      },
    },
    module: {
      strictExportPresence: true,
      rules: [
        { parser: { requireEnsure: false } },
        {
          oneOf: [
            // typescript
            {
              test: /\.(ts|tsx)$/,
              include: paths.appSrc,
              use: {
                loader: require.resolve('babel-loader'),
                options: { ...babelOptions(isProduction, pkg.importPlugin), forceEnv: enviroments.raw.NODE_ENV },
              },
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
            // svg sprite, 处理以.icon.svg结尾的svg文件
            {
              test: /\.icon\.svg$/,
              use: [
                require.resolve('cache-loader'),
                {
                  loader: require.resolve('svg-sprite-loader'),
                  options: {
                    esModule: false,
                  },
                },
                require.resolve('svgo-loader'),
              ],
            },
            // images
            {
              test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/, /\.svg/],
              loader: require.resolve('url-loader'),
              options: {
                limit: 10000,
                name: `static/media/${filePrefix}[name].[ext]${$('', '?[hash:8]')}`,
              },
            },
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
      splitChunks: {
        name: true,
        cacheGroups: {
          // 第三方共有包
          vendor: {
            name: 'vendor',
            test: /node_modules/,
            reuseExistingChunk: false,
            chunks: 'initial',
            minChunks: 2,
            enforce: true, // 强制
            priority: 10,
          },
          // 应用内共有包
          commons: {
            test: /src/,
            name: 'commons',
            chunks: 'initial',
            reuseExistingChunk: false,
            minChunks: 2,
            priority: 10,
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
        tslint: paths.appTsLintConfig,
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

export default configure
