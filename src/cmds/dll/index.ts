import fs from 'fs-extra'
import webpack from 'webpack'
import formatMessages from 'webpack-format-messages'
import path from 'path'
import sortBy from 'lodash/sortBy'
import hash from 'hash-sum'
import paths from '../../paths'
import getOptions from '../../options'
import configure from '../../config/dll.config'
import { inspect, message, getModuleVersion } from '../../utils'
import { CommonOption } from '../type'

export interface DllOption extends CommonOption {}

const mode = 'development'
const pkg = require(paths.appPackageJson)

process.env.NODE_ENV = mode

require('../../env')

async function generateHash(modules: string[]) {
  try {
    const pkgs = await Promise.all(
      modules.map(m =>
        getModuleVersion(m).then(version => {
          if (version == null) {
            throw new Error(`Module ${m} not found`)
          }
          return {
            name: m,
            version,
          }
        }),
      ),
    )

    message.info('List of modules will be compiled: ')
    pkgs.forEach(i => console.log(`    ${i.name}: ${i.version}`))

    const key = sortBy(pkgs, ['name'])
      .map(m => `${m.name}:${m.version}`)
      .join('/')
    return hash(key)
  } catch (err) {
    message.error(err.message)
    process.exit(1)
    return ''
  }
}

async function shouldUpdateDll(hashFile: string, key: string) {
  if (!fs.existsSync(hashFile)) {
    return true
  }

  const prevKey = fs.readFileSync(hashFile).toString()

  return prevKey !== key
}

export default async (argv: DllOption) => {
  const environment = require('../../env').default()
  const jmOptions = getOptions(pkg)
  if (jmOptions == null) {
    return
  }

  if (environment.raw.DISABLE_DLL === 'true') {
    message.warn('DISABLE_DLL have set. Webpack DLL references will be disabled')
  }

  const config = configure(environment, pkg, paths, { jmOptions })
  const modules = (config.entry as { dll: string[] }).dll
  const hashFile = path.join(paths.appCache, '.hash')
  const key = await generateHash(modules)
  const shouldUpdate = await shouldUpdateDll(hashFile, key)

  if (!shouldUpdate) {
    message.info('Nothing Changed, exit')
    return
  }

  if (argv.inspect) {
    inspect(config, 'Webpack Configuration:')
  }

  const compiler = webpack(config)
  compiler.run((err, stats) => {
    if (err) {
      message.error('Failed to compile:')
      console.error(err.stack || err)
      // @ts-ignore
      if (err.details) {
        // @ts-ignore
        console.error(err.details)
      }
      return
    }
    const messages = formatMessages(stats)
    if (messages.errors.length) {
      message.error('Failed to compile.\n\n')
      messages.errors.forEach(e => console.log(e))
      return
    }

    if (messages.warnings.length) {
      message.warn('Compiled with warnings.\n\n')
      messages.warnings.forEach(e => console.log(e))
    } else {
      message.success('Compiled successfully.')
    }

    // 更新hash
    fs.writeFileSync(hashFile, key)
  })
}
