/**
 * Start development server
 */
import webpackDevServer, { Configuration } from 'webpack-dev-server'
import detectPort from 'detect-port'
import { Configuration as WebpackConfiguration, Compiler } from 'webpack'
import formatMessages from 'webpack-format-messages'
import webpack = require('webpack')
import chalk from 'chalk'
import opener from 'opener'
import { prepareUrls } from '../utils'
import paths from '../paths'
import { CommonOption } from './type'

export interface StartOption extends CommonOption {
  entry?: string[]
}

process.on('unhandledRejection', err => {
  throw err
})

const mode = 'development'
process.env.NODE_ENV = mode

// initial enviroments variables
require('../env')

/**
 * get webpack-dev-server options
 * @param proxy
 */
function getDevServerConfig(proxy: Configuration['proxy'], webpackConfig: WebpackConfiguration): Configuration {
  return {
    disableHostCheck: !proxy,
    compress: true,
    clientLogLevel: 'none',
    contentBase: [paths.appPublic, paths.appDist],
    watchContentBase: true,
    hot: true,
    publicPath: webpackConfig.output!.publicPath,
    quiet: true,
    watchOptions: {
      ignored: /node_modules/,
    },
    https: process.env.HTTPS === 'true',
    proxy,
  }
}

/**
 * create webpack compiler and listen build events
 * @param config
 */
function createCompiler(config: WebpackConfiguration): Compiler {
  let compiler: Compiler
  try {
    compiler = webpack(config)
  } catch (err) {
    // config error
    console.error(chalk.red('❌  Failed to compile.\n'))
    console.log(err.message || err)
    console.log()
    process.exit(1)
  }

  compiler!.hooks.invalid.tap('invalid', () => {
    console.log(chalk.cyan('Compiling...'))
  })

  compiler!.hooks.done.tap('done', stats => {
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
  })

  return compiler!
}

async function choosePort(defaultPort: number) {
  const port = await detectPort(defaultPort)
  if (port !== defaultPort) {
    console.log(
      chalk.yellow(`⚠️  Default Port(${chalk.red(':' + defaultPort)}) was occupied, trying ${chalk.green(':' + port)}`),
    )
  }
  return port
}

export default async function(argv: StartOption) {
  // TODO: 检查是否是react项目
  // TODO: 依赖检查
  // TODO: 选择端口
  console.log(chalk.cyan('Starting the development server...\n'))
  const port = await choosePort(parseInt(process.env.PORT as string, 10) || 8080)
  const protocol = process.env.HTTPS === 'true' ? 'https' : 'http'
  const host = '0.0.0.0'
  const environment = require('../env').default()
  const pkg = require(paths.appPackageJson)
  const config = require('../config').default(environment, pkg, paths, { entry: argv.entry })

  if (argv.inspect) {
    console.log(config)
    return
  }

  const compiler = createCompiler(config)
  const devServerConfig = getDevServerConfig(pkg.proxy || {}, config)
  const devServer = new webpackDevServer(compiler, devServerConfig)

  devServer.listen(port, host, err => {
    if (err) {
      return console.log(err)
    }

    const urls = prepareUrls(protocol, host, port)
    console.log(`Development server deployed at ${chalk.cyan(urls.lanUrlForTerminal || urls.localUrlForTerminal)}`)
    opener(urls.localUrlForBrowser)
  })
  ;['SIGINT', 'SIGTERM'].forEach(sig => {
    process.on(sig as NodeJS.Signals, () => {
      devServer.close()
      process.exit()
    })
  })
}
