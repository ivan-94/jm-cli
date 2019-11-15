import { WebpackPaths } from '../../paths'
import { resolveModuleInCwd, message } from '../../utils'
import { JMOptions } from '../type'

/**
 * 生成ForkTsCheckerWebpackPlugin参数
 */
export default (paths: WebpackPaths, env: StringObject, options: JMOptions, override: object) => {
  const isProduction = env.NODE_ENV === 'production'
  const async = isProduction || options.enableTypescriptAsyncCheck
  if (async) {
    message.info('async checking typescript')
  }
  return {
    typescript: resolveModuleInCwd('typescript'),
    tsconfig: paths.appTsConfig,
    useTypescriptIncrementalApi: true,
    // 废弃了tslint
    tslint: undefined,
    // 配合webpack-dev-server使用
    async,
    silent: !async,
    // 配合ts-loader的happyPackMode使用, 即由当前组件全权处理Typescript文件的检查(语法和语义(默认))
    checkSyntacticErrors: true,
    formatter: 'codeframe',
    ...override,
  }
}
