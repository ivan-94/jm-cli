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

const JSONREGXP = /^\/(.*)\/$/
function isJsonRegexp(str: string) {
  return str.match(JSONREGXP)
}

const configure: WebpackConfigurer = (env, pkg, paths, argv) => {
  const { jmOptions } = argv

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
    mode: 'development',
    entry: generateEntry(),
    devtool: 'eval',
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
    performance: {
      hints: false,
    },
  }
}

export default configure
