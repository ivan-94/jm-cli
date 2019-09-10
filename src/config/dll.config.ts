/**
 * 生成开发环境dll包, 提升开发环境编译速度
 *
 * 配置:
 * + 默认dependencies下的包会被编译到DLL
 * + 使用jm.dll.exclude可以排除dependencies中的某些依赖被打包, 支持正则表达式, 如"/^@types/"
 * + 使用jm.dll.include 添加dependencies之外的依赖
 *
 * > 可以使用DISABLE_DLL禁用dll包的编译和引用
 */
import webpack from 'webpack'
import path from 'path'
import { WebpackConfigurer } from './type'
import uniq from 'lodash/uniq'
import pullAllWith from 'lodash/pullAllWith'

import terserPluginOptions from './utils/terserPluginOptions'
import optimizeCSSAssetsPlugin from './utils/optimizeCSSAssetsPlugin'

const TerserPlugin = require('terser-webpack-plugin')
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin')

const JSONREGXP = /^\/(.*)\/$/
function isJsonRegexp(str: string) {
  return str.match(JSONREGXP)
}

const configure: WebpackConfigurer = (env, pkg, paths, argv) => {
  const { jmOptions } = argv
  const isProduction = env.raw.NODE_ENV === 'production'
  const shouldUseSourceMap = env.raw.SOURCE_MAP !== 'false'

  function generateEntry() {
    // electron 模式使用 optionalDependencies
    const names = Object.keys((jmOptions.electron ? pkg.optionalDependencies : pkg.dependencies) || {})
    const exclude = (argv.jmOptions.dll && argv.jmOptions.dll.exclude) || []
    const include = (argv.jmOptions.dll && argv.jmOptions.dll.include) || []
    const includeDependencies = uniq(names.concat(include))

    return {
      dll: pullAllWith(includeDependencies, exclude, (i, e) => {
        const reg = isJsonRegexp(e)
        if (!!reg) {
          return !!i.match(new RegExp(reg[1]))
        }
        return i === e
      }),
    }
  }

  return {
    context: paths.appSrc,
    mode: env.raw.NODE_ENV as any,
    entry: generateEntry(),
    devtool: isProduction ? (shouldUseSourceMap ? 'cheap-source-map' : undefined) : 'cheap-module-source-map',
    output: {
      filename: '[name].js',
      path: paths.appCache,
      library: '[name]',
    },
    plugins: [
      new webpack.DllPlugin({
        context: paths.appSrc,
        name: '[name]',
        path: path.join(paths.appCache, '[name].json'),
      }),
      new webpack.DefinePlugin(env.stringified),
    ],
    optimization: isProduction
      ? {
          minimize: true,
          minimizer: [
            new TerserPlugin(terserPluginOptions(shouldUseSourceMap)),
            new OptimizeCSSAssetsPlugin(optimizeCSSAssetsPlugin(shouldUseSourceMap)),
          ],
        }
      : undefined,
    performance: {
      hints: false,
    },
  }
}

export default configure
