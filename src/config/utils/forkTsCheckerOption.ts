import { WebpackPaths } from '../../paths'
import { resolveModuleInCwd } from '../../utils'

import getTslintConfig from './tslintConfig'

/**
 * 生成ForkTsCheckerWebpackPlugin参数
 */
export default (paths: WebpackPaths, env: StringObject, override: object) => {
  const isProduction = env.NODE_ENV === 'production'
  return {
    typescript: resolveModuleInCwd('typescript'),
    tsconfig: paths.appTsConfig,
    useTypescriptIncrementalApi: true,
    tslint: getTslintConfig(paths.appTsLintConfig, env),
    // 配合webpack-dev-server使用
    async: isProduction,
    silent: true,
    // 配合ts-loader的happyPackMode使用, 即由当前组件全权处理Typescript文件的检查(语法和语义(默认))
    checkSyntacticErrors: true,
    formatter: 'codeframe',
    ...override,
  }
}
