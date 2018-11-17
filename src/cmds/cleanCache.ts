/**
 * 删除babel和cache loader 缓存
 */
import path from 'path'
import fs from 'fs-extra'
import paths from '../paths'

export default () => {
  const cacheLoaderCache = path.join(paths.appNodeModules, '.cache-loader')
  const babelCache = path.join(paths.appNodeModules, '.cache')
  fs.emptyDirSync(cacheLoaderCache)
  fs.emptyDirSync(babelCache)
}
