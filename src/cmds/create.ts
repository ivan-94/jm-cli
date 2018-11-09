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

export interface CreateOption {
  name: string
  version?: string
  template?: string
}

const useYarn = shouldUseYarn()
const builinDevDependencies = [
  // format
  'prettier',
  'pretty-quick',
  'husky',
]

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

function transformDependencies(org: { [key: string]: string }): string[] {
  return Object.keys(org).map(key => `${key}@${org[key]}`)
}

function initialPackageJson(
  appPath: string,
  templatePath: string,
  ownPath: string,
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
    // prettier format
    husky: {
      hooks: {
        'pre-commit': 'pretty-quick --staged',
      },
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

  fs.copySync(templatePath, appPath, { overwrite: false, errorOnExist: false })
  copyPrettierConfig(appPath, ownPath, pacakgeJson)
  fs.writeFileSync(path.join(appPath, 'package.json'), JSON.stringify(pacakgeJson, null, 2) + os.EOL)

  console.log(`Installing pacakges. This might take a couple of minutes.`)

  const devdependencies = builinDevDependencies
    .filter(dep => {
      return !(dep in pacakgeJson.dependencies) && !(dep in pacakgeJson.devDependencies)
    })
    .concat(transformDependencies(pacakgeJson.devDependencies))
  const dependencies = transformDependencies(pacakgeJson.dependencies)

  // install cli commands
  let packageToInstall = cliName
  if (cliVersion) {
    const validSemver = semver.valid(cliVersion)
    if (validSemver) {
      packageToInstall += `@${validSemver}`
    }
  }

  devdependencies.push(packageToInstall)

  let dependenciesInstallCommand: string
  let devDependenciesInstallCommand: string
  if (useYarn) {
    const command = 'yarnpkg'
    dependenciesInstallCommand = `${command} add ${dependencies.join(' ')}`
    devDependenciesInstallCommand = `${command} add ${devdependencies.join(' ')} --dev`
  } else {
    const command = 'npm'
    dependenciesInstallCommand = `${command} install ${dependencies.join(' ')} --save`
    devDependenciesInstallCommand = `${command} install ${devdependencies.join(' ')} --save-dev`
  }

  console.log(chalk.cyan(`Installing dependencies...`))
  execSync(dependenciesInstallCommand, { stdio: 'inherit' })
  console.log(chalk.cyan(`Installing devdependencies...`))
  execSync(devDependenciesInstallCommand, { stdio: 'inherit' })
}

function tryInitialGit(appPath: string) {
  try {
    execSync('git init', { stdio: 'ignore' })
    return true
  } catch (e) {
    return false
  }
}

function firstCommit() {
  try {
    execSync('git add -A', { stdio: 'ignore' })
    execSync('git commit -m "Initial commit from jm-cli"', {
      stdio: 'ignore',
    })
  } catch {
    // ignore
  }
}

function copyPrettierConfig(appPath: string, ownPath: string, pkg: { [key: string]: any }) {
  const legalPrettierConfigName = [
    '.prettierrc',
    '.prettierrc.json',
    'prettier.config.js',
    '.prettierrc.yaml',
    '.prettierrc.toml',
    '.prettierrc.yml',
  ]
  for (let file of legalPrettierConfigName) {
    if (fs.existsSync(path.join(appPath, file))) {
      return
    }
  }
  if (pkg.prettier == null) {
    pkg.prettier = fs.readJSONSync(path.join(ownPath, '.prettierrc'))
  }
}

/**
 * @param cwd 当前工作目录
 * @param originalDirname cli项目根目录
 * @param argv 命令参数
 */
export default (cwd: string, originalDirname: string, argv: CreateOption) => {
  const { name, version, template } = argv
  validatePackageName(name)
  const appPath = path.join(cwd, name)
  ensureAppPath(appPath)
  console.log(`Creating a new React Project in ${chalk.green(cwd)}\n`)
  process.chdir(appPath)

  // initialized git before install packages, because some package like `husky` depend on Git enviroment
  let gitInitialed = tryInitialGit(appPath)
  if (gitInitialed) {
    console.log('Initialized a git repository.')
  }

  // TODO: 支持自定义template
  const templatePath = path.join(originalDirname, 'template')
  if (!fs.existsSync(templatePath)) {
    console.error(`Template path ${templatePath} not existed.`)
    process.exit(1)
  }

  // create package.json
  const ownPackageJson = require(path.join(originalDirname, 'package.json'))
  initialPackageJson(appPath, templatePath, originalDirname, {
    name,
    cliName: ownPackageJson.name,
    cliVersion: version,
    binName: Object.keys(ownPackageJson.bin as object)[0],
  })

  if (gitInitialed) {
    firstCommit()
  }

  // TODO: 显示欢迎信息
}
