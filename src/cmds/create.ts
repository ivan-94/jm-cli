/**
 * create project
 */
import path from 'path'
import chalk from 'chalk'
import fs from 'fs-extra'
import json5 from 'json5'
import os from 'os'
import validateNpmName from 'validate-npm-package-name'
import semver from 'semver'
import { execSync } from 'child_process'
import omit from 'lodash/omit'
import { shouldUseYarn, writeJSON, clearConsole } from '../utils'

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
  '@types/webpack-env',
  '@types/react-hot-loader',
]

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

function getInstallPackage(templateName: string, cwd: string) {
  if (templateName && templateName.match(/^file:/)) {
    return `file:${path.resolve(cwd, templateName.match(/^file:(.*)?$/)![1])}`
  }
  return templateName
}

function ensureTemplatePath(ownPath: string, cwd: string, templateName?: string): string {
  if (templateName == null) {
    // default template
    return path.join(ownPath, 'template')
  }

  // install template from npm
  templateName = getInstallPackage(templateName, cwd)
  const tempDir = path.join(os.tmpdir(), '.jm')
  const tempPackageJson = path.join(tempDir, 'package.json')
  const tempPackageJsonExisted = fs.existsSync(tempPackageJson)

  // 已存在, 不需要重复下载
  if (tempPackageJsonExisted) {
    const pkg = fs.readJsonSync(tempPackageJson)
    if (pkg.templates && templateName in pkg.templates) {
      return pkg.templates[templateName]
    }
  }

  process.chdir(tempDir)

  try {
    if (!tempPackageJsonExisted) {
      writeJSON('package.json', { name: 'temp', version: '0.1.0' })
    }

    console.log(`Downloading template from ${chalk.cyan(templateName)}...`)
    const argv = ['install', templateName, '--save-bundle']
    execSync(`npm ${argv.join(' ')}`, { stdio: ['ignore', 'ignore', 'inherit'] })

    const pkg = fs.readJSONSync('package.json')
    let pkgName = pkg.bundleDependencies && pkg.bundleDependencies[0]
    if (pkgName == null) {
      throw new Error(`cannot read package name from ${chalk.cyan(templateName)}.`)
    }
    const modulePath = path.join(tempDir, 'node_modules', pkgName)
    // save download records
    pkg.templates = {
      ...(pkg.templates || {}),
      [templateName]: modulePath,
    }
    delete pkg.bundleDependencies
    writeJSON('package.json', pkg)

    return modulePath
  } catch (err) {
    console.log(chalk.red(`❌  Failed to download template from ${chalk.cyan(templateName)}:`))
    console.log(err.message)
    process.exit(1)
    // suppress Typescript type check
    return ''
  }
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
  const reservedProperties = {
    name,
    version: '0.1.0',
    private: true,
    dependencies: {},
    devDependencies: {},
    scripts: {
      start: `${binName} start`,
      build: `${binName} build`,
      serve: `${binName} serve`,
      analyze: `${binName} analyze`,
    },
    // prettier format
    husky: {
      hooks: {
        'pre-commit': 'pretty-quick --staged',
      },
    },
  }
  const optionalProperties = {
    jm: {
      // proxy config, can use template variable in .env.*
      proxy: {},
      // for antd, antd-mobile
      importPlugin: [],
    },
  }
  let pacakgeJson = {
    ...reservedProperties,
    ...optionalProperties,
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

    if (pkg.scripts) {
      pacakgeJson.scripts = { ...pacakgeJson.scripts, ...pkg.scripts }
    }

    // 其他配置
    pacakgeJson = { ...pacakgeJson, ...omit(pkg, Object.keys(reservedProperties)) }
  }

  const exclude = [/^node_modules/, /^dist/, /yarn\.lock/]
  fs.copySync(templatePath, appPath, {
    overwrite: false,
    errorOnExist: false,
    dereference: true,
    filter: src => {
      const relativePath = path.relative(templatePath, src)
      return !exclude.some(reg => relativePath.search(reg) !== -1)
    },
  })
  copyPrettierConfig(appPath, ownPath, pacakgeJson)
  writeJSON(path.join(appPath, 'package.json'), pacakgeJson)

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
  execSync(dependenciesInstallCommand, { stdio: ['ignore', 'ignore', 'inherit'] })
  console.log(chalk.cyan(`Installing devdependencies...`))
  execSync(devDependenciesInstallCommand, { stdio: ['ignore', 'ignore', 'inherit'] })
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
 * 初始化tsconfig.json
 * TODO: 目前tsconfig.json 不支持extends node_modules 中的配置. 而且baseurl和rootDir都是相对tsconfi.json所在的位置
 */
function initialTsConfig(appPath: string, ownPath: string, ownPkg: { [key: string]: any }) {
  const tsConfigPath = path.join(appPath, 'tsconfig.json')
  const builinTsConfigPath = path.join(ownPath, 'lib/tsconfig.json')

  if (fs.existsSync(tsConfigPath)) {
    return
  }

  fs.copyFileSync(builinTsConfigPath, tsConfigPath)
}

function initialTsLintConfig(appPath: string, ownPath: string, ownPkg: { [key: string]: any }) {
  const tsLintConfigPath = path.join(appPath, 'tslint.json')
  const builinTsLintConfigPath = path.posix.join(ownPkg.name, 'lib/tslint.json')

  if (fs.existsSync(tsLintConfigPath)) {
    const config = json5.parse(fs.readFileSync(tsLintConfigPath).toString()) as {
      extends?: string | string[]
      defaultSeverity?: string
    }
    let dirty: boolean = false
    if (config.extends) {
      if (typeof config.extends === 'string' && config.extends !== builinTsLintConfigPath) {
        config.extends = [builinTsLintConfigPath, config.extends]
        dirty = true
      } else if (config.extends.indexOf(builinTsLintConfigPath) === -1) {
        ;(config.extends as string[]).unshift(builinTsLintConfigPath)
        dirty = true
      }
    }

    if (config.defaultSeverity && config.defaultSeverity !== 'warning') {
      config.defaultSeverity = 'warning'
      dirty = true
    }

    if (dirty) {
      writeJSON(tsLintConfigPath, config)
    }
  } else {
    writeJSON(tsLintConfigPath, {
      extends: [builinTsLintConfigPath],
    })
  }
}

function initialVscodeSettings(appPath: string, ownPath: string, ownPkg: { [key: string]: any }) {
  const vscodeSettingsDir = path.join(appPath, '.vscode')
  const vscodeSettingsPath = path.join(vscodeSettingsDir, 'settings.json')
  if (fs.existsSync(vscodeSettingsPath)) {
    return
  }

  const settings = {
    // options auto completions
    'json.schemas': [
      {
        fileMatch: ['package.json'],
        url: `./node_modules/${ownPkg.name}/lib/package.option.schema.json`,
      },
    ],
  }

  fs.ensureDirSync(vscodeSettingsDir)
  writeJSON(vscodeSettingsPath, settings)
}

/**
 * welcome infomation
 */
function welcome(args: { name: string; appPath: string }) {
  const cmd = useYarn ? 'yarn' : 'npm'
  clearConsole()
  console.log(`
✨ Success! Created ${chalk.blue(args.name)} at ${chalk.cyan(args.appPath)}
Inside that directory, you can run several commands:\n
  ${chalk.green(`${cmd} start`)}  ${chalk.gray(`# Starts the development server.`)}
  ${chalk.green(`${cmd} build`)}  ${chalk.gray(`# Bundles the app into static files for production.`)}
  ${chalk.green(`${cmd} serve`)}  ${chalk.gray(`# Serve production bundle in 'dist'`)}
  ${chalk.green(`${cmd} analyze`)}  ${chalk.gray(`# Analyze webpack bundle for production`)}

Typing ${chalk.green(`cd ${args.name}`)} to start code happily.
  `)
}

/**
 * @param cwd 当前工作目录
 * @param originalDirname cli项目根目录
 * @param argv 命令参数
 */
export default (cwd: string, originalDirname: string, argv: CreateOption) => {
  clearConsole()
  console.log(`Creating a new React Project in ${chalk.green(cwd)}\n`)

  const { name, version, template } = argv
  validatePackageName(name)
  const templatePath = ensureTemplatePath(originalDirname, cwd, template)
  if (!fs.existsSync(templatePath)) {
    console.error(`Template path ${templatePath} not existed.`)
    process.exit(1)
  }
  const appPath = path.join(cwd, name)
  ensureAppPath(appPath)
  process.chdir(appPath)

  // initialized git before install packages, because some package like `husky` depend on Git enviroment
  let gitInitialed = tryInitialGit(appPath)
  if (gitInitialed) {
    console.log('Initialized a git repository.')
  }

  // create package.json
  const ownPackageJson = require(path.join(originalDirname, 'package.json'))
  initialPackageJson(appPath, templatePath, originalDirname, {
    name,
    cliName: ownPackageJson.name,
    cliVersion: version,
    binName: Object.keys(ownPackageJson.bin as object)[0],
  })

  initialTsConfig(appPath, originalDirname, ownPackageJson)
  initialTsLintConfig(appPath, originalDirname, ownPackageJson)
  initialVscodeSettings(appPath, originalDirname, ownPackageJson)

  if (gitInitialed) {
    firstCommit()
  }

  welcome({
    name,
    appPath,
  })
}
