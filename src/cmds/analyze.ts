/**
 * analyze webpack bundle
 */
import webpack from 'webpack'
import chalk from 'chalk'
import formatMessages from 'webpack-format-messages'
import analyzer from 'webpack-bundle-analyzer'
import { noopFileSystem, inspect, clearConsole } from '../utils'
import paths from '../paths'
import getOptions from '../options'
import configure from '../config'
import { CommonOption } from './type'

export interface AnalyzeOption extends CommonOption {
  entry?: string[]
}

const mode = 'production'
process.env.NODE_ENV = mode

// initial env
require('../env')

function analyze(argv: AnalyzeOption) {
  const environment = require('../env').default()
  const pkg = require(paths.appPackageJson)
  const jmOptions = getOptions(pkg, paths.ownLib)
  if (jmOptions == null) {
    return
  }
  const config = configure(environment, pkg, paths, { entry: argv.entry, jmOptions })

  if (argv.inspect) {
    inspect(environment.raw, 'Environment:')
    inspect(config, 'Webpack Configuration:')
    return
  }

  clearConsole()
  console.log(chalk.cyan('Extracting webpack stats...'))
  const compiler = webpack(config)
  compiler.outputFileSystem = noopFileSystem

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

    if (stats.hasErrors()) {
      console.error(chalk.red('❌  Failed to compile.\n\n'))
      const messages = formatMessages(stats)
      if (messages.errors.length) {
        messages.errors.forEach(e => console.log(e))
      }
      return
    }

    analyzer.start(stats.toJson())

    console.log(chalk.green('Extract successfully.'))
  })
}

export default (argv: AnalyzeOption) => {
  analyze(argv)
}
