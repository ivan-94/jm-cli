/**
 * 定义项目路径
 */
import path from 'path'
import fs from 'fs-extra'

const appDirectory = fs.realpathSync(process.cwd())

function resolveInApp(relatvePath: string) {
  return path.resolve(appDirectory, relatvePath)
}

function resolveOwn(relatvePath: string) {
  return path.resolve(__dirname, '..', relatvePath)
}

const paths = {
  // app
  appDotenv: resolveInApp('.env'),
  appPath: resolveInApp('.'),
  appDist: resolveInApp('dist'),
  appPublic: resolveInApp('public'),
  appElectronMain: resolveInApp('src/main'),
  appElectronRenderer: resolveInApp('src'),
  appSrc: resolveInApp('src'),
  appTsConfig: resolveInApp('tsconfig.json'),
  appTsLintConfig: resolveInApp('tslint.json'),
  appNodeModules: resolveInApp('node_modules'),
  appPackageJson: resolveInApp('package.json'),
  appHtml: resolveInApp('public/index.html'),
  appCache: resolveInApp('.jm-cache'),

  // own
  ownPath: resolveOwn('.'),
  ownLib: resolveOwn('lib'),
  ownData: resolveOwn('data'),
  ownNodeModules: resolveOwn('node_modules'),
  ownPackageJson: resolveOwn('package.json'),
  ownHtml: resolveOwn('lib/index.html'),
}

export type WebpackPaths = typeof paths
export default paths
