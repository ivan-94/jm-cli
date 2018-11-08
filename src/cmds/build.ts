/**
 * build project
 * TODO: 支持多个入口组并行编译
 */
import path from 'path'
import webpack from 'webpack'
import fs from 'fs-extra'
import paths from '../paths'
import chalk from 'chalk'
import formatMessages from 'webpack-format-messages'

const mode = 'production'
process.env.NODE_ENV = mode

// initial env
require('../env')

process.on('uncaughtException', err => {
  throw err
})

function build() {
  console.log(chalk.cyan('Creating an optimized production build...'))
  const environment = require('../env').default()
  const pkg = require(paths.appPackageJson)
  const config = require('../config').default(environment, pkg, paths, {})
  const compiler = webpack(config)

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
    // @ts-ignore
    const sec = (stats.endTime - stats.startTime) / 1e3
    console.log(`✨ Done in ${sec}s!`)
  })
}

export default () => {
  fs.emptyDirSync(paths.appDist)
  fs.copySync(paths.appPublic, paths.appDist, { dereference: false })
  build()
}
