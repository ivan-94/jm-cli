/**
 * create project
 */
import path from 'path'
import chalk from 'chalk'
import os from 'os'
import fs from 'fs-extra'
import validateNpmName from 'validate-npm-package-name'
import { shouldUseYarn } from '../utils'
import semver from 'semver'
import { execSync } from 'child_process'

const useYarn = shouldUseYarn()

process.on('uncaughtException', err => {
  throw err
})

/**
 * 检查是否是合法的npm包名
 * @param name
 */
function validatePackageName(name: string) {
  const res = validateNpmName(name)
  if (!res.validForNewPackages) {
    console.error(`Could not create a project called ${chalk.red(name)} because of npm naming restrictions:`)
    printValidationResults(res.errors)
    printValidationResults(res.warnings)
    process.exit(1)
  }
}

function printValidationResults(results?: string[]) {
  if (typeof results !== 'undefined') {
    results.forEach(error => {
      console.error(chalk.red(`  *  ${error}`))
    })
  }
}

function ensureAppPath(appPath: string) {
  if (fs.existsSync(appPath)) {
    const name = path.basename(appPath)
    console.error(`Could not create a project called ${name}, directory existed.`)
    process.exit(1)
  }
  fs.ensureDirSync(appPath)
}

function initialPackageJson(
  appPath: string,
  templatePath: string,
  argv: {
    name: string
    cliName: string
    cliVersion?: string
    binName: string
  },
) {
  const { name, binName, cliName, cliVersion } = argv
  let pacakgeJson = {
    name,
    version: '0.1.0',
    private: true,
    dependencies: {},
    devDependencies: {},
    scripts: {
      start: `${binName} start`,
      build: `${binName} build`,
    },
  }

  const templatePackageJson = path.join(templatePath, 'package.json')

  if (fs.existsSync(templatePackageJson)) {
    const pkg = require(templatePackageJson)
    pacakgeJson = { ...pkg, ...pacakgeJson }

    if (pkg.dependencies) {
      pacakgeJson.dependencies = { ...pacakgeJson.dependencies, ...pkg.dependencies }
    }

    if (pkg.devDependencies) {
      pacakgeJson.devDependencies = { ...pacakgeJson.devDependencies, ...pkg.devDependencies }
    }

    // TODO: 其他配置
    if (pkg.scripts) {
      pacakgeJson.scripts = { ...pacakgeJson.scripts, ...pkg.scripts }
    }
  }

  fs.writeFileSync(path.join(appPath, 'package.json'), JSON.stringify(pacakgeJson, null, 2) + os.EOL)
  fs.copySync(templatePath, appPath, { overwrite: false, errorOnExist: false })

  let command: string
  let args: string[]
  if (useYarn) {
    command = 'yarnpkg'
  } else {
    command = 'npm'
  }

  console.log(`Installing pacakges. This might take a couple of minutes.`)
  execSync(`${command}`, { stdio: 'inherit' })

  // install cli commands
  let packageToInstall = cliName
  if (cliVersion) {
    const validSemver = semver.valid(cliVersion)
    if (validSemver) {
      packageToInstall += `@${validSemver}`
    }
  }

  if (useYarn) {
    args = ['add', packageToInstall, '--dev']
  } else {
    args = ['install', '--save-dev', packageToInstall]
  }
  execSync(`${command} ${args.join(' ')}`, { stdio: 'inherit' })
}

function tryInitialGit(appPath: string) {
  let didInit = false
  try {
    execSync('git init', { stdio: 'ignore' })
    didInit = true

    execSync('git add -A', { stdio: 'ignore' })
    execSync('git commit -m "Initial commit from jm-cli"', {
      stdio: 'ignore',
    })
    return true
  } catch (e) {
    if (didInit) {
      // If we successfully initialized but couldn't commit,
      // maybe the commit author config is not set.
      // In the future, we might supply our own committer
      // like Ember CLI does, but for now, let's just
      // remove the Git files to avoid a half-done state.
      try {
        // unlinkSync() doesn't work on directories.
        fs.removeSync(path.join(appPath, '.git'))
      } catch (removeErr) {
        // Ignore.
      }
    }
    return false
  }
}

/**
 * @param cwd 当前工作目录
 * @param originalDirname cli项目根目录
 * @param argv 命令参数
 */
export default (
  cwd: string,
  originalDirname: string,
  argv: {
    name: string
    version?: string
    template?: string
  },
) => {
  const { name, version, template } = argv
  validatePackageName(name)
  const appPath = path.join(cwd, name)
  ensureAppPath(appPath)
  console.log(`Creating a new React Project in ${chalk.green(cwd)}\n`)
  process.chdir(appPath)
  // create package.json

  // TODO: 支持自定义template
  const templatePath = path.join(originalDirname, 'template')
  if (!fs.existsSync(templatePath)) {
    console.error(`Template path ${templatePath} not existed.`)
    process.exit(1)
  }

  const ownPackageJson = require(path.join(originalDirname, 'package.json'))
  initialPackageJson(appPath, templatePath, {
    name,
    cliName: ownPackageJson.name,
    cliVersion: version,
    binName: Object.keys(ownPackageJson.bin as object)[0],
  })

  if (tryInitialGit(appPath)) {
    console.log('Initialized a git repository.')
  }

  // TODO: 显示欢迎信息
}
