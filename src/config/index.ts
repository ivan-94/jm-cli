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
const HtmlWebpackPlugin = require('html-webpack-plugin')

const configure: WebpackConfigurer = (enviroments, pkg, paths, argv) => {
  const isProduction = process.env.NODE_ENV === 'production'
  const $ = <D, P>(development: D, production: P) => (isProduction ? production : development)

  const envConfig = $(devConfig, prodConfig)(enviroments, pkg, paths, argv)
  const context = paths.appSrc
  const pageExt = enviroments.raw.PAGE_EXT || '.html'
  const entries = getEntries(context, pageExt, enviroments.raw.IGNORE)

  if (Object.keys(entries).length === 0) {
    console.log(`Not pages(*${pageExt}) existed in ${chalk.blue(context)}`)
    process.exit()
  }

  const webpackConfig: Configuration = {
    context,
    mode: $('development', 'production'),
    devtool: enviroments.raw.SOURCE_MAP === 'false' ? false : $('cheap-source-map', 'source-map'),
    entry: entries,
    output: {
      filename: `static/js/[name].js${$('', '?[hash:8]')}`,
      chunkFilename: `static/js/[name].js${$('', '?[hash:8]')}`,
      path: paths.appDist,
      pathinfo: true,
      publicPath: enviroments.raw.PUBLIC_URL,
    },
    resolve: {
      modules: ['node_modules'],
      extensions: ['.tsx', '.ts', '.js'],
      alias: {
        // 可以直接使用@src访问相对于源代码目录的模块，优化查找效率
        // 如 @src/components/Button
        '@src': context,
      },
    },
    module: {
      rules: [
        {
          oneOf: [
            // typescript
            {
              test: /\.tsx?$/,
              use: [
                require.resolve('cache-loader'),
                {
                  loader: require.resolve('ts-loader'),
                  options: $(
                    {
                      experimentalWatchApi: true,
                    },
                    {
                      transpileOnly: true,
                      experimentalWatchApi: true,
                    },
                  ),
                },
              ],
              exclude: /node_modules/,
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
                name: `static/media/[name].[ext]${$('', '?[hash:8]')}`,
              },
            },
            ...((envConfig.module && envConfig.module.rules) || []),
            {
              // Exclude `js` files to keep "css" loader working as it injects
              // its runtime that would otherwise be processed through "file" loader.
              // Also exclude `html` and `json` extensions so they get processed
              // by webpacks internal loaders.
              exclude: [/\.(js|jsx|mjs)$/, /\.html$/, /\.json$/],
              loader: require.resolve('file-loader'),
              options: {
                name: `static/media/[name].[ext]${$('', '?[hash:8]')}`,
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
            chunks: 'all',
            reuseExistingChunk: false,
            minChunks: 2,
            priority: 10,
          },
          default: false,
        },
      },
      ...(envConfig.optimization || {}),
    },
    plugins: [
      // 移除moment语言包
      new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
      new webpack.DefinePlugin(enviroments.stringified),
      ...genTemplatePlugin(context, isProduction, enviroments.raw, pageExt),
      ...(envConfig.plugins || []),
    ],
    performance: envConfig.performance,
  }

  return webpackConfig
}

function getEntries(context: string, pageExt: string, ignores?: string | string[]) {
  const pages = scanPages(context, pageExt, ignores)
  const entries: { [name: string]: string } = {
    // TODO: polyfill
    // polyfill: require.resolve('./polyfill.js'),
  }

  pages.forEach(pagePath => {
    const fileName = path.basename(pagePath, pageExt)
    let entryFileExt = '.tsx'

    if (fs.existsSync(path.join(context, `${fileName}.tsx`))) {
      entryFileExt = '.tsx'
    } else if (fs.existsSync(path.join(context, `${fileName}.ts`))) {
      entryFileExt = '.ts'
    } else {
      console.error(
        `${chalk.green(
          `${fileName}${pageExt}`,
        )} founded, but not any entry file(${fileName}.tsx or ${fileName}.ts) found in ${context}.`,
      )
      process.exit(1)
    }

    // 检查入口文件是否存在
    const entry = `./${fileName}${entryFileExt}`
    entries[fileName] = entry
  })

  return entries
}

/**
 * scan enty pages
 */
function scanPages(context: string, ext: string, ignores?: string | string[]) {
  ignores = ignores || []
  return glob.sync(path.join(context, `*${ext}`), {
    ignore: ignores,
  })
}

// 生成*.html 文件
function genTemplatePlugin(
  context: string,
  isProduction: boolean,
  templateParameters: { [key: string]: string },
  ext: string = '.html',
) {
  const ignores = getIgnore(templateParameters.IGNORE_ENTRIES)
  const pages = scanPages(context, ext, ignores)
  return pages.map(pagePath => {
    const name = path.basename(pagePath, ext)
    const filename = path.basename(pagePath, ext)
    return new HtmlWebpackPlugin({
      templateParameters,
      filename: filename + '.html',
      inject: true,
      chunks: ['polyfill', 'vendor', 'commons', name],
      template: pagePath,
      minify: isProduction
        ? {
            removeAttributeQuotes: true,
            removeComments: true,
            collapseWhitespace: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
          }
        : undefined,
    })
  })
}

function getIgnore(ignores: string) {
  if (ignores == null || ignores === '') {
    return []
  }
  return ignores.split(',')
}

export default configure
