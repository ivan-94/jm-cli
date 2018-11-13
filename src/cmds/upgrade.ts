/**
 * upgrade self
 */
import { execSync } from 'child_process'
import fs from 'fs-extra'
import { CommonOption } from './type'
import { shouldUseYarn, clearConsole } from '../utils'
import path from 'path'
import paths from '../paths'
import chalk from 'chalk'

export type SemverLevel = 'major' | 'minor' | 'patch'
export interface UpgradeOption extends CommonOption {
  global?: boolean
  yarn?: boolean
  level?: SemverLevel
}

function getMaxSatisfying(packageName: string, range: string) {
  let version = JSON.parse(execSync(`npm view "${packageName}@${range}" version --json`).toString())
  console.log('shit', version)

  if (Array.isArray(version)) {
    version = version[version.length - 1]
  }

  return version
}

/**
 *
 * @param packageName
 * @param verison sepecific version
 * @param semverLevel
 */
export function getUpgradableVersion(
  packageName: string,
  verison: string,
  semverLevel: SemverLevel,
): [string, boolean] {
  let newRange: string
  let upgradable: boolean
  if (semverLevel === 'patch') {
    newRange = `~${verison}`
    const newMaxVersion = getMaxSatisfying(packageName, newRange)
    newRange = `~${newMaxVersion}`
    upgradable = newMaxVersion !== verison
  } else if (semverLevel === 'minor') {
    newRange = `^${verison}`
    const newMaxVersion = getMaxSatisfying(packageName, newRange)
    newRange = `^${newMaxVersion}`
    upgradable = newMaxVersion !== verison
  } else {
    const newMaxVersion = getMaxSatisfying(packageName, 'latest')
    newRange = `^${newMaxVersion}`
    upgradable = newMaxVersion !== verison
  }

  return [newRange, upgradable]
}

function getYarnGlobalInstallPackages() {
  const list: { [name: string]: string } = {}
  execSync('yarn global list -s --json --no-progress')
    .toString()
    .split('\n')
    .map<{ type: 'info' | 'list'; data: string }>(info => (info.trim() === '' ? {} : JSON.parse(info)))
    .filter(i => i.type === 'info')
    .forEach(i => {
      const matched = i.data.match(/^"(.*)@(.*)"/)
      if (matched) {
        list[matched[1]] = matched[2]
      }
    })
  return list
}

function getNpmGlobalInstallPackages() {
  const list: { [name: string]: string } = {}
  const data = JSON.parse(execSync('npm list -g --depth=0 --json').toString()) as {
    dependencies: { [name: string]: { version: string } }
  }
  Object.keys(data.dependencies).forEach(key => {
    list[key] = data.dependencies[key].version
  })
  return list
}

function globalUpgrade(useYarn: boolean, level: SemverLevel, pkg: { name: string; version: string }) {
  console.log(`Current verison: ${pkg.version}`)
  const list: { [name: string]: string } = useYarn ? getYarnGlobalInstallPackages() : getNpmGlobalInstallPackages()
  const { name, version } = pkg
  if (!(name in list)) {
    throw new Error(chalk.red(`${chalk.cyan(name)} is not installed globally in ${useYarn ? 'yarn' : 'npm'}`))
  }

  const [newRange, upgradable] = getUpgradableVersion(name, version, level)
  if (upgradable) {
    console.log(`New version ${chalk.cyan(newRange)} founded.`)
    const cmd = useYarn ? `yarn global add "${name}@${newRange}"` : `npm install -g "${name}@${newRange}"`
    console.log('Upgrading...')
    execSync(cmd, { stdio: ['ignore', 'ignore', 'inherit'] })
    console.log('✨ Upgrade Success!')
  } else {
    console.log(`Already up-to-date`)
  }
}

function getLocalVersion(name: string): string {
  if (!fs.existsSync(paths.appPackageJson)) {
    throw new Error('package.json not existed in current directory.')
  } else {
    let pkg = fs.readJsonSync(paths.appPackageJson)
    if (pkg.devDependencies == null || !(name in pkg.devDependencies)) {
      throw new Error(`${chalk.cyan(name)} not installded on local project`)
    }
    const ownPkgPath = path.join(paths.appNodeModules, name, 'package.json')
    if (!fs.existsSync(ownPkgPath)) {
      throw new Error(`${chalk.cyan(name)} not installded on local project`)
    }
    return fs.readJSONSync(ownPkgPath).version
  }
}

function localUpgrade(useYarn: boolean, level: SemverLevel, pkg: { name: string; version: string }) {
  const name = pkg.name
  const version = getLocalVersion(name)
  console.log(`Current verison: ${version}`)
  const [newRange, upgradable] = getUpgradableVersion(name, version, level)
  if (upgradable) {
    console.log(`New version ${chalk.cyan(newRange)} founded.`)
    const cmd = useYarn ? `yarn add "${name}@${newRange}" -D` : `npm install "${name}@${newRange}" --save-dev`
    console.log('Upgrading...')
    execSync(cmd, { stdio: ['ignore', 'ignore', 'inherit'] })
    console.log('✨ Upgrade Success!')
  } else {
    console.log(`Already up-to-date`)
  }
}

export default (argv: UpgradeOption) => {
  const useYarn = argv.yarn == null ? shouldUseYarn() : argv.yarn
  const pkg = fs.readJsonSync(paths.ownPackageJson)
  clearConsole()

  try {
    if (argv.global) {
      console.log(`Gathering package infos for global ${chalk.cyan(pkg.name)}...`)
      globalUpgrade(useYarn, argv.level!, pkg)
    } else {
      console.log(`Gathering package infos for local ${chalk.cyan(pkg.name)}...`)
      localUpgrade(useYarn, argv.level!, pkg)
    }
  } catch (err) {
    console.log(chalk.red(`❌  Failed to upgrade: ${chalk.gray(err.message)}`))
  }
}
