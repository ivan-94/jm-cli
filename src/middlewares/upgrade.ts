/**
 * Check for updates regularly
 */
import { Arguments } from 'yargs'
import { execSync } from 'child_process'
import boxen from 'boxen'
import fs from 'fs-extra'
import chalk from 'chalk'
import inquirer from 'inquirer'
import path from 'path'
import Ora from 'ora'
import { getYarnGlobalInstallPackages, getNpmGlobalInstallPackages, getUpgradableVersion } from '../services/upgrade'
import paths from '../paths'
import { shouldUseYarn, IS_CI } from '../utils'

const Daily = 24 * 3600 * 1000
let spinner = new Ora()

/**
 * 判断是否是全局模式调用命令
 */
function isGlobalMode() {
  // 在当前项目node_modules下
  return !paths.ownPath.startsWith(paths.appPath)
}

function checkGlobalUpdate(useYarn: boolean, pkg: { name: string; version: string }) {
  spinner.text = 'Checking for update...'
  spinner.start()
  let list = useYarn ? getYarnGlobalInstallPackages() : getNpmGlobalInstallPackages()
  const { name, version } = pkg

  if (!(name in list) || list[name] !== version) {
    // 检查是否安装在其他模块管理器
    list = useYarn ? getNpmGlobalInstallPackages() : getYarnGlobalInstallPackages()
    if (!(name in list)) {
      return
    }
    useYarn = !useYarn
  }

  // 全局模式检查是否有最新版本
  const [, upgradable, newMaxVersion] = getUpgradableVersion(name, version, 'major')
  spinner.stop()
  if (upgradable) {
    showUpdateInfo(useYarn, name, version, newMaxVersion)
  }
}

function showUpdateInfo(useYarn: boolean, name: string, version: string, newVersion: string) {
  // 输出提醒
  const message = `Update available ${chalk.dim(version)} ${chalk.reset(' → ')} ${chalk.green(
    newVersion,
  )} \n Run ${chalk.cyan(useYarn ? `yarn global upgrade ${name}` : `npm i -g ${name}`)} to update`
  console.log(
    '\n',
    boxen(message, {
      padding: 1,
      margin: 1,
      align: 'center',
      borderColor: 'yellow',
      borderStyle: 'round',
    }),
    '\n',
  )
}

async function checkLocalUpdate(useYarn: boolean, pkg: { name: string; version: string }) {
  spinner.text = 'Checking for update...'
  spinner.start()
  const { name, version } = pkg
  const [newRange, upgradable, newMaxVersion] = getUpgradableVersion(name, version, 'minor')
  if (upgradable) {
    showUpdateInfo(useYarn, name, version, newMaxVersion)
    const { ok } = await inquirer.prompt<{ ok: boolean }>({
      type: 'confirm',
      message: 'update now?',
      name: 'ok',
      default: true,
    })

    if (ok) {
      const cmd = useYarn ? `yarn add "${name}@${newRange}" -D` : `npm install "${name}@${newRange}" --save-dev`
      spinner.start()
      spinner.text = 'Upgrading...'
      execSync(cmd, { stdio: ['ignore', 'ignore', 'inherit'] })
      console.log(cmd)
      spinner.succeed('Upgrade Success!')
    }
  }
}

export default async (argv: Arguments) => {
  if (IS_CI) {
    return
  }

  const lastUpdatePath = path.join(paths.ownData, 'lastupdate')
  fs.ensureDirSync(paths.ownData)

  // 首次安装，暂不需要检查
  if (!fs.existsSync(lastUpdatePath)) {
    fs.writeJSONSync(lastUpdatePath, Date.now())
    return
  }
  const lastUpdate = fs.readJSONSync(lastUpdatePath) as number

  if (Date.now() - lastUpdate < Daily) {
    return
  }

  const globalModel = isGlobalMode()
  const useYarn = shouldUseYarn()
  const pkg = fs.readJsonSync(paths.ownPackageJson)
  try {
    if (globalModel) {
      checkGlobalUpdate(useYarn, pkg)
    } else {
      await checkLocalUpdate(useYarn, pkg)
    }
  } finally {
    // save lastUpdate
    fs.writeJSONSync(lastUpdatePath, Date.now())
    spinner.stop()
  }
}
