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
  appElectronMain: resolveInApp('main'),
  appElectronShare: resolveInApp('share'),
  appElectronRenderer: resolveInApp('src'),
  appSrc: resolveInApp('src'),
  appTsConfig: resolveInApp('tsconfig.json'),
  appTsLintConfig: resolveInApp('tslint.json'),
  appNodeModules: resolveInApp('node_modules'),
  appPackageJson: resolveInApp('package.json'),

  // own
  ownPath: resolveOwn('.'),
  ownLib: resolveOwn('lib'),
  ownData: resolveOwn('data'),
  ownNodeModules: resolveOwn('node_modules'),
  ownPackageJson: resolveOwn('package.json'),
}

export type WebpackPaths = typeof paths
export default paths
