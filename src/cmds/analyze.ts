/**
 * analyze webpack bundle
 */
import path from 'path'
import webpack from 'webpack'
import chalk from 'chalk'
import formatMessages from 'webpack-format-messages'
import analyzer from 'webpack-bundle-analyzer'
import { noopFileSystem } from '../utils'
import paths from '../paths'

export interface AnalyzeOption {
  entry?: string[]
}

const mode = 'production'
process.env.NODE_ENV = mode

// initial env
require('../env')

process.on('uncaughtException', err => {
  throw err
})

function analyze(argv: AnalyzeOption) {
  console.log(chalk.cyan('Extracting webpack stats...'))

  const environment = require('../env').default()
  const pkg = require(paths.appPackageJson)
  const configure = require('../config').default
  const compiler = webpack(configure(environment, pkg, paths, { entry: argv.entry }))
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
