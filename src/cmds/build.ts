/**
 * build project
 */
import Table from 'cli-table2'
import webpack, { Configuration } from 'webpack'
import fs from 'fs-extra'
import paths from '../paths'
import chalk from 'chalk'
import formatMessages from 'webpack-format-messages'
import { CommonOption } from './type'

export interface BuildOption extends CommonOption {
  entry?: string[]
  group?: StringArrayObject
}

const mode = 'production'
process.env.NODE_ENV = mode

// initial env
require('../env')

process.on('uncaughtException', err => {
  throw err
})

function build(argv: BuildOption) {
  console.log(chalk.cyan('Creating an optimized production build...'))

  const environment = require('../env').default()
  const pkg = require(paths.appPackageJson)
  const configure = require('../config').default
  let config: Configuration[] | Configuration

  if (argv.group) {
    const group = argv.group
    console.log(`Building multi-entry-group project:`)
    const table = new Table({
      head: ['Group', 'Entries'],
    })
    Object.keys(group).forEach(key => {
      // @ts-ignore
      table.push([key, group[key].join(', ')])
    })
    console.log(`\n${chalk.bgWhite(table.toString())}\n`)
    config = Object.keys(group).map(name =>
      configure(environment, pkg, paths, {
        name,
        entry: group[name],
      }),
    )
  } else if (argv.entry) {
    console.log(`Selected entries: ${chalk.cyan(argv.entry.join(', '))}`)
    config = configure(environment, pkg, paths, { entry: argv.entry })
  } else {
    config = configure(environment, pkg, paths, {})
  }

  if (argv.inspect) {
    console.log(config)
    return
  }

  const compiler = webpack(config as Configuration)
  const startTime = Date.now()

  compiler.run((err, stats) => {
    if (err) {
      console.error(chalk.red('❌ Failed to compile.'))
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
      console.error(chalk.red('❌  Failed to compile.\n\n'))
      messages.errors.forEach(e => console.log(e))
      return
    }

    if (messages.warnings.length) {
      console.warn(chalk.yellow('⚠️  Compiled with warnings.\n\n'))
      messages.warnings.forEach(e => console.log(e))
      return
    }

    console.log(chalk.green('Compiled successfully.'))
    const sec = (Date.now() - startTime) / 1e3
    console.log(`✨ Done in ${sec}s!`)
  })
}

export default (argv: BuildOption) => {
  fs.emptyDirSync(paths.appDist)
  fs.copySync(paths.appPublic, paths.appDist, { dereference: false })
  build(argv)
}
