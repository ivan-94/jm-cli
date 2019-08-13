/**
 * analyze webpack bundle
 */
import webpack, { Configuration } from 'webpack'
import chalk from 'chalk'
import fs from 'fs-extra'
import path from 'path'
import Table from 'cli-table2'
import formatMessages from 'webpack-format-messages'
import analyzer from 'webpack-bundle-analyzer'
import Ora from 'ora'
import { message, noopFileSystem, inspect, choosePort, logSymbols } from '../utils'
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
  const jmOptions = getOptions(pkg)
  if (jmOptions == null) {
    return
  }

  let config: Configuration[] | Configuration

  // FIXME: group 分析目前还有一些问题, 只能分析单一分组信息
  if (argv.group) {
    // 应用分组模式
    const group = argv.group
    message.info(`selected entries:`)
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
    message.info(`Selected entries: ${chalk.cyan(argv.entry.join(', '))}`)
    config = configure(environment, pkg, paths, { entry: argv.entry, jmOptions })
  } else {
    config = configure(environment, pkg, paths, { jmOptions })
  }

  if (argv.inspect) {
    inspect(environment.raw, 'Environment:')
    inspect(config, 'Webpack Configuration:')
    return
  }

  const spinner = new Ora({ text: 'Extracting webpack stats...' }).start()
  const compiler = webpack(config as Configuration)
  compiler.outputFileSystem = noopFileSystem

  compiler.run(async (err, stats) => {
    if (err) {
      spinner.stopAndPersist({ text: 'Failed to compile.', symbol: logSymbols.error })
      console.error(err.stack || err)
      // @ts-ignore
      if (err.details) {
        // @ts-ignore
        console.error(err.details)
      }
      return
    }

    if (stats.hasErrors()) {
      spinner.stopAndPersist({ text: 'Failed to compile.\n\n', symbol: logSymbols.error })
      const messages = formatMessages(stats)
      if (messages.errors.length) {
        messages.errors.forEach(e => console.log(e))
      }
      return
    }

    const port = await choosePort(8888)

    const json = stats.toJson()
    analyzer.start(json, { port })

    await fs.writeFile(path.join(paths.appDist, 'stat.json'), json)

    spinner.stopAndPersist({ text: 'Extract successfully.', symbol: logSymbols.success })
  })
}

export default (argv: AnalyzeOption) => {
  analyze(argv)
}
