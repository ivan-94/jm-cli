/**
 * analyze webpack bundle
 */
import webpack, { Configuration } from 'webpack'
import chalk from 'chalk'
import Table from 'cli-table2'
import formatMessages from 'webpack-format-messages'
import analyzer from 'webpack-bundle-analyzer'
import { noopFileSystem, inspect, clearConsole, choosePort } from '../utils'
import paths from '../paths'
import getOptions from '../options'
import configure from '../config'
import { CommonOption } from './type'

export interface AnalyzeOption extends CommonOption {
  entry?: string[]
  group?: StringArrayObject
}

const mode = 'production'
process.env.NODE_ENV = mode

// initial env
require('../env')

async function analyze(argv: AnalyzeOption) {
  const environment = require('../env').default()
  const pkg = require(paths.appPackageJson)
  const jmOptions = getOptions(pkg, paths.ownLib)
  if (jmOptions == null) {
    return
  }

  let config: Configuration[] | Configuration

  if (argv.group) {
    // 应用分组模式
    const group = argv.group
    console.log(`Analyzing multi-entry-group project:`)
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
        jmOptions,
      }),
    )
  } else if (argv.entry) {
    // 显示指定入口
    console.log(`Selected entries: ${chalk.cyan(argv.entry.join(', '))}`)
    config = configure(environment, pkg, paths, { entry: argv.entry, jmOptions })
  } else {
    config = configure(environment, pkg, paths, { jmOptions })
  }

  if (argv.inspect) {
    inspect(environment.raw, 'Environment:')
    inspect(config, 'Webpack Configuration:')
    return
  }

  clearConsole()
  console.log(chalk.cyan('Extracting webpack stats...'))
  const compiler = webpack(config as Configuration)
  compiler.outputFileSystem = noopFileSystem

  compiler.run(async (err, stats) => {
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

    if (stats.hasErrors()) {
      console.error(chalk.red('❌  Failed to compile.\n\n'))
      const messages = formatMessages(stats)
      if (messages.errors.length) {
        messages.errors.forEach(e => console.log(e))
      }
      return
    }

    const port = await choosePort(8888)

    analyzer.start(stats.toJson(), { port })

    console.log(chalk.green('Extract successfully.'))
  })
}

export default (argv: AnalyzeOption) => {
  analyze(argv)
}
