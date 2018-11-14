/**
 * upgrade self
 */
import chalk from 'chalk'
import fs from 'fs-extra'
import { execSync } from 'child_process'
import paths from '../paths'
import {
  SemverLevel,
  getYarnGlobalInstallPackages,
  getNpmGlobalInstallPackages,
  getUpgradableVersion,
  getLocalVersion,
} from '../services/upgrade'
import { shouldUseYarn, clearConsole } from '../utils'
import { CommonOption } from './type'

export interface UpgradeOption extends CommonOption {
  global?: boolean
  yarn?: boolean
  level?: SemverLevel
  dryRun?: boolean
}

export function globalUpgrade(
  useYarn: boolean,
  level: SemverLevel,
  pkg: { name: string; version: string },
  dryRun: boolean,
) {
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
    if (dryRun) {
      return
    }
    console.log('Upgrading...')
    execSync(cmd, { stdio: ['ignore', 'ignore', 'inherit'] })
    console.log('✨ Upgrade Success!')
  } else {
    console.log(`Already up-to-date`)
  }
}

export function localUpgrade(
  useYarn: boolean,
  level: SemverLevel,
  pkg: { name: string; version: string },
  dryRun: boolean,
) {
  const name = pkg.name
  const version = getLocalVersion(name)
  console.log(`Current verison: ${version}`)
  const [newRange, upgradable] = getUpgradableVersion(name, version, level)
  if (upgradable) {
    console.log(`New version ${chalk.cyan(newRange)} founded.`)
    if (dryRun) {
      return
    }
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
  const global = argv.global
  const level = argv.level || (argv.global ? 'major' : 'minor')
  clearConsole()

  try {
    if (global) {
      console.log(`Gathering package infos for global ${chalk.cyan(pkg.name)}...`)
      globalUpgrade(useYarn, level, pkg, !!argv.dryRun)
    } else {
      console.log(`Gathering package infos for local ${chalk.cyan(pkg.name)}...`)
      localUpgrade(useYarn, level, pkg, !!argv.dryRun)
    }
  } catch (err) {
    console.log(chalk.redBright(`❌  Failed to upgrade: ${chalk.white(err.message || err)}`))
  }
}
