/**
 * upgrade self
 */
import chalk from 'chalk'
import fs from 'fs-extra'
import paths from '../paths'
import { SemverLevel, globalUpgrade, localUpgrade } from '../services/upgrade'
import { shouldUseYarn, clearConsole } from '../utils'
import { CommonOption } from './type'

export interface UpgradeOption extends CommonOption {
  global?: boolean
  yarn?: boolean
  level?: SemverLevel
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
    console.log(chalk.redBright(`❌  Failed to upgrade: ${chalk.white(err.message || err)}`))
  }
}
