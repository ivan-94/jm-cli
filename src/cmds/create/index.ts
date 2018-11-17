/**
 * create project
 */
import path from 'path'
import chalk from 'chalk'
import fs from 'fs-extra'
import ignore from 'ignore'
import validateNpmName from 'validate-npm-package-name'
import semver from 'semver'
import { execSync } from 'child_process'
import pickBy from 'lodash/pickBy'
import { shouldUseYarn, writeJSON } from '../../utils'
import ensureTemplatePath from './getTemplate'
import genGitIgnore from './genGitignore'
import genGlobalDeclaration from './genGlobalDeclaration'
import genVscodeSettings from './genVscodeSettings'
import genTsLintConfig from './genTsLintConfig'
import genTsConfig from './genTsConfig'

export interface CreateOption {
  force?: boolean
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

/**
 * clone files from templatePath to appPath,
 * default it will ignore `node_modules`, `dist` and `yarn.*`, `.git` etc
 * Template developer also define `.template-ignore` to add ignore rules
 * .gitignore will automatic recognized by npm
 * @param templatePath
 * @param appPath
 */
function cloneTemplate(templatePath: string, appPath: string) {
  const ig = ignore()
  const defaultIgnore = ['node_modules', 'dist', 'yarn.*', '.git', '.template-ignore', '.cache-loader']
  ig.add(defaultIgnore)
  const templateIgnorePath = path.join(templatePath, '.template-ignore')

  if (fs.existsSync(templateIgnorePath)) {
    ig.add(fs.readFileSync(templateIgnorePath).toString())
  }

  fs.copySync(templatePath, appPath, {
    overwrite: false,
    errorOnExist: false,
    dereference: true,
    filter: src => {
      const relativePath = path.relative(templatePath, src)
      if (relativePath === '') {
        return true
      }
      return !ig.ignores(relativePath)
    },
  })
}

function transformDependencies(org: { [key: string]: string }): string[] {
  return Object.keys(org).map(key => {
    if (org[key] === '*') {
      return key
    }
    return `${key}@${org[key]}`
  })
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
  let { name, binName, cliName, cliVersion } = argv
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
    browsers: 'last 2 versions',
    optionalDependencies: {},
  }
  let pacakgeJson: { [key: string]: any } = {
    ...reservedProperties,
    ...optionalProperties,
  }

  const templatePackageJson = path.join(templatePath, 'package.json')

  if (fs.existsSync(templatePackageJson)) {
    const pkg = require(templatePackageJson)

    if (pkg.dependencies) {
      pacakgeJson.dependencies = { ...pacakgeJson.dependencies, ...pkg.dependencies }
    }

    if (pkg.devDependencies) {
      pacakgeJson.devDependencies = { ...pacakgeJson.devDependencies, ...pkg.devDependencies }
    }

    if (pkg.scripts) {
      pacakgeJson.scripts = { ...pacakgeJson.scripts, ...pkg.scripts }
    }

    // 合并package.json
    const includeFields: string[] = pkg.includeFields || []
    const pickedPkg = pickBy(
      pkg,
      (value, key) => key in optionalProperties || key.startsWith('jm') || includeFields.indexOf(key) !== -1,
    )

    pacakgeJson = {
      ...pacakgeJson,
      // whitelist
      ...pickedPkg,
    }
  }

  // install cli commands
  let packageToInstall = cliName
  cliVersion = cliVersion || pacakgeJson.devDependencies[cliName]
  delete pacakgeJson.devDependencies[cliName]
  if (cliVersion) {
    const validSemver = semver.valid(cliVersion)
    if (validSemver) {
      packageToInstall += `@${validSemver}`
    }
  }

  cloneTemplate(templatePath, appPath)
  copyPrettierConfig(appPath, ownPath, pacakgeJson)
  writeJSON(path.join(appPath, 'package.json'), pacakgeJson)

  console.log(`Installing pacakges. This might take a couple of minutes.`)

  const devdependencies = builinDevDependencies
    .filter(dep => {
      return !(dep in pacakgeJson.dependencies) && !(dep in pacakgeJson.devDependencies)
    })
    .concat(transformDependencies(pacakgeJson.devDependencies))
  const dependencies = transformDependencies(pacakgeJson.dependencies)

  devdependencies.push(packageToInstall)

  let dependenciesInstallCommand: string
  let devDependenciesInstallCommand: string
  if (useYarn) {
    const command = 'yarnpkg'
    dependenciesInstallCommand = `${command} add ${dependencies.join(' ')} -s`
    devDependenciesInstallCommand = `${command} add ${devdependencies.join(' ')} --dev -s`
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
 * welcome infomation
 */
function welcome(args: { name: string; appPath: string }) {
  const cmd = useYarn ? 'yarn' : 'npm'
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
export default async (cwd: string, originalDirname: string, argv: CreateOption) => {
  console.log(`Creating a new React Project in ${chalk.green(cwd)}\n`)

  const { name, version, template } = argv
  validatePackageName(name)
  const templatePath = await ensureTemplatePath(!!argv.force, originalDirname, cwd, template)
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

  const generators = [genTsConfig, genTsLintConfig, genVscodeSettings, genGlobalDeclaration, genGitIgnore]
  generators.forEach(g => g(appPath, originalDirname, ownPackageJson))

  if (gitInitialed) {
    firstCommit()
  }

  welcome({
    name,
    appPath,
  })
}
