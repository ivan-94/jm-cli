/**
 * 生成cache-loader参数
 */
import hash from 'hash-sum'
import path from 'path'
import { WebpackPaths } from '../../paths'

export default function genCacheConfig(
  id: string,
  enviroments: StringObject,
  paths: WebpackPaths,
  partialIdentifier?: any,
) {
  const cacheDirectory = path.join(paths.appNodeModules, `.cache-loader/${id}`)
  const ownPkg = require(paths.ownPackageJson)

  // 这些变量将影响缓存id
  const variables = {
    // 自定义id
    partialIdentifier,
    // cli的版本号, 由于配置相关的所有东西都是cli控制的, 所以cli版本号是主要的影响因素
    cli: ownPkg.version,
    // 环境
    env: enviroments.NODE_ENV,
  }

  const cacheIdentifier = hash(variables)
  return { cacheDirectory, cacheIdentifier }
}
