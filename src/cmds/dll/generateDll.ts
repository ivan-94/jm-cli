import fs from 'fs-extra'
import webpack from 'webpack'
import formatMessages from 'webpack-format-messages'
import sortBy from 'lodash/sortBy'
import hash from 'hash-sum'
import { message, getModuleVersion, inspect } from '../../utils'
import { WebpackPaths } from '../../paths'
import configure from '../../config/dll.config'
import chalk from 'chalk'
import { WebpackEnviroment } from 'src/env'
import { JMOptions } from 'src/config/type'

interface Pkg {
  name: string
  version: string
}

async function getPkgs(modules: string[]): Promise<Pkg[]> {
  try {
    const pkgs = await Promise.all(
      modules.map(m =>
        getModuleVersion(m).then(version => {
          if (version == null) {
            throw new Error(`[DLL] Module ${m} not found`)
          }
          return {
            name: m,
            version,
          }
        }),
      ),
    )

    return pkgs
  } catch (err) {
    message.error(err.message)
    process.exit(1)
    return []
  }
}

function generateHash(pkgs: Pkg[], salt: string) {
  const key = sortBy(pkgs, ['name'])
    .map(m => `${m.name}:${m.version}`)
    .join('/')
  return hash(key + salt)
}

async function shouldUpdateDll(hashFile: string, key: string) {
  if (!fs.existsSync(hashFile)) {
    return true
  }

  const prevKey = fs.readFileSync(hashFile).toString()

  return prevKey !== key
}

export default async function generateDll(
  environment: WebpackEnviroment,
  pkg: any,
  paths: WebpackPaths,
  argv: {
    jmOptions: JMOptions
    inspect?: boolean
  },
) {
  const isElecton = argv.jmOptions.electron
  const config = configure(environment, pkg, paths, { jmOptions: argv.jmOptions })

  if (isElecton) {
    message.info('[DLL] Electron mode will use `optionalDependencies` as DLL input')
  }

  if (argv.inspect) {
    inspect(config, 'Webpack Configuration:')
    return
  }

  const modules = (config.entry as { dll: string[] }).dll

  if (modules.length === 0) {
    message.info('[DLL] No modules detected. skip')
    return
  }

  const pkgs = await getPkgs(modules)
  const now = new Date()
  const salt = `${pkg.version}/${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`
  const key = generateHash(pkgs, salt)
  const shouldUpdate = await shouldUpdateDll(paths.appDllHash, key)

  if (!shouldUpdate) {
    message.info('[DLL] Nothing Changed. skip')
    return
  }

  message.info('[DLL] List of modules will be compiled: ')
  pkgs.forEach(i => console.log(`    ${i.name}: ${i.version}`))

  const compiler = webpack(config)
  return new Promise((res, rej) => {
    compiler.run((err, stats) => {
      if (err) {
        message.error('[DLL] Failed to compile:')
        console.error(err.stack || err)
        // @ts-ignore
        if (err.details) {
          // @ts-ignore
          console.error(err.details)
        }
        rej(err)
        return
      }
      const messages = formatMessages(stats)
      if (messages.errors.length) {
        message.error('[DLL] Failed to compile.\n\n')
        messages.errors.forEach(e => console.log(e))
        rej(new Error('[DLL] Failed to compile'))
        return
      }

      if (messages.warnings.length) {
        message.warn('[DLL] Compiled with warnings.\n\n')
        messages.warnings.forEach(e => console.log(e))
      } else {
        message.success('[DLL] Compiled successfully.')
      }

      // 更新hash
      fs.writeFileSync(paths.appDllHash, key)
      message.success(
        `[DLL] DLL compiled successfully, call ${chalk.cyan(
          'jm start',
        )} Will automatically load dll to improve compilation speed, you can set ${chalk.red(
          'DISABLE_DLL',
        )} to turn it off.`,
      )

      res()
    })
  }).catch(err => {
    fs.emptyDirSync(paths.appCache)
    throw err
  })
}
