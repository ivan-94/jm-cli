/**
 * 生产环境配置
 */
import fs from 'fs'
import webpack from 'webpack'
import path from 'path'
import HtmlInjectedDllReferences from './plugins/HtmlInjectedDllReferences'

import { message } from '../utils'

import { WebpackConfigurer } from './type'
import terserPluginOptions from './utils/terserPluginOptions'
import optimizeCSSAssetsPlugin from './utils/optimizeCSSAssetsPlugin'

const DuplicatePackageCheckerPlugin = require('duplicate-package-checker-webpack-plugin')
const CircularDependencyPlugin = require('circular-dependency-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin')

const configure: WebpackConfigurer = (enviroments, pkg, paths, argv) => {
  function isSupportDll() {
    if (enviroments.raw.DISABLE_DLL === 'true' || !argv.jmOptions.enableDllInProduction) {
      return false
    }

    return fs.existsSync(paths.appDllHash)
  }

  const supportDll = isSupportDll()

  if (supportDll) {
    message.info('DllReference Turned on in production')
  }

  const { name } = argv
  const filePrefix = name ? `${name}_` : ''
  const shouldUseSourceMap = enviroments.raw.SOURCE_MAP !== 'false'
  const isElectron = argv.jmOptions.electron

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
      supportDll &&
        new webpack.DllReferencePlugin({
          context: paths.appSrc,
          manifest: path.join(paths.appCache, 'dll.json'),
          name: 'dll',
        }),
      supportDll && new HtmlInjectedDllReferences('dll'),
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
        name: !isElectron,
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
          ...(isElectron
            ? {}
            : {
                // 应用内共有包
                commons: {
                  test: /src/,
                  chunks: 'initial',
                  reuseExistingChunk: true,
                  minChunks: 2,
                  priority: -20,
                },
              }),
        },
      },
      // Keep the runtime chunk seperated to enable long term caching
      runtimeChunk: isElectron
        ? undefined
        : {
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
        new TerserPlugin(terserPluginOptions(shouldUseSourceMap)),
        new OptimizeCSSAssetsPlugin(optimizeCSSAssetsPlugin(shouldUseSourceMap)),
      ],
    },
    performance: {
      hints: 'warning',
      assetFilter: assetFilename => !/(\.map$)|(^(vendor\.|favicon\.))/.test(assetFilename),
    },
  }
}

export default configure
