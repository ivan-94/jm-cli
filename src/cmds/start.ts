/**
 * Start development server
 * TODO: electron依赖检查
 */
import webpackDevServer, { Configuration } from 'webpack-dev-server'
import webpack, { Configuration as WebpackConfiguration, Compiler } from 'webpack'
import formatMessages from 'webpack-format-messages'
import ch from 'child_process'
import chalk from 'chalk'
import opener from 'opener'
import { message, prepareUrls, inspect, clearConsole, choosePort, requireInCwd } from '../utils'
import { interpolateProxy, proxyInfomation, ProxyConfig } from '../proxy'
import showInfo from '../services/info'
import checkElectron from '../services/checkElectron'
import getOptions from '../options'
import configure from '../config'
import electronMainConfigure from '../config/electron-main'
import paths from '../paths'
import { CommonOption } from './type'
import Ora = require('ora')

export interface StartOption extends CommonOption {
  entry?: string[]
}

const mode = 'development'
process.env.NODE_ENV = mode

// initial enviroments variables
require('../env')

/**
 * get webpack-dev-server options
 * @param proxy
 */
function getDevServerConfig(
  proxy: Configuration['proxy'],
  webpackConfig: WebpackConfiguration,
  enviroments: { [key: string]: string },
): Configuration {
  // https://github.com/chimurai/http-proxy-middleware
  // https://webpack.docschina.org/configuration/dev-server/#devserver-proxy
  // 解析proxy支持变量, 只会解析context和target
  if (proxy) {
    // @ts-ignore
    proxy = interpolateProxy(proxy, enviroments)
  }

  return {
    disableHostCheck: true,
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
    // 使用原生的overlap
    // TODO: 使用更先进的react-error-overlay
    overlay: {
      errors: true,
      warnings: false,
    },
  }
}

/**
 * create webpack compiler and listen build events
 * @param config
 */
function createCompiler(config: WebpackConfiguration, electronMainConfig?: WebpackConfiguration): Compiler {
  let compiler: Compiler
  try {
    // @ts-ignore
    compiler = webpack(electronMainConfig ? [electronMainConfig, config] : config)
  } catch (err) {
    // config error
    message.error(chalk.red('Failed to compile.\n'))
    console.log(err.message || err)
    console.log()
    process.exit(1)
  }
  let spinner = new Ora()

  compiler!.hooks.invalid.tap('invalid', () => {
    clearConsole()
    spinner.text = 'Compiling...'
    spinner.start()
  })

  compiler!.hooks.done.tap('done', stats => {
    spinner.stop()
    const messages = formatMessages(stats)
    if (messages.errors.length) {
      message.error('Failed to compile.\n\n')
      messages.errors.forEach(e => console.log(e))
      return
    }

    if (messages.warnings.length) {
      message.warn('Compiled with warnings.\n\n')
      messages.warnings.forEach(e => console.log(e))
      return
    }

    message.success(chalk.green('Compiled successfully.'))
  })

  return compiler!
}

function openByElectron() {
  ch.spawn(requireInCwd('electron'), ['.'])
}

export default async function(argv: StartOption) {
  // TODO: 检查是否是react项目
  // TODO: 依赖检查
  const environment = require('../env').default()
  const pkg = require(paths.appPackageJson)
  const jmOptions = getOptions(pkg)
  if (jmOptions == null) {
    return
  }

  const isEelectron = jmOptions.electron
  if (isEelectron) {
    message.info('Electron 模式')
    checkElectron()
  }

  const electronMainConfig = isEelectron ? electronMainConfigure(environment, pkg, paths, { jmOptions }) : undefined
  const config = configure(environment, pkg, paths, { entry: argv.entry, jmOptions })
  const devServerConfig = getDevServerConfig(jmOptions.proxy || {}, config, environment.raw)

  if (argv.inspect) {
    inspect(environment.raw, 'Environment:')
    inspect(devServerConfig, 'Development Server Config:')
    inspect(config, 'Webpack Configuration:')
    return
  }

  const spinner = new Ora({ text: 'Starting the development server...\n' }).start()
  const compiler = createCompiler(config, electronMainConfig)
  const devServer = new webpackDevServer(compiler, devServerConfig)

  const port = await choosePort(parseInt(process.env.PORT as string, 10) || 8080)
  const protocol = process.env.HTTPS === 'true' ? 'https' : 'http'
  const host = '0.0.0.0'

  devServer.listen(port, host, err => {
    spinner.stop()
    if (err) {
      message.error('Fail to setup development server:')
      console.log(message)
      return
    }

    const urls = prepareUrls(protocol, host, port)
    message.info(showInfo())
    message.info(`Development server running at ${chalk.cyan(urls.lanUrlForTerminal || urls.localUrlForTerminal)}`)
    message.info(`Webpack output is served from ${chalk.cyan('/')}`)
    const contentBase = devServerConfig.contentBase
    const folders =
      typeof contentBase === 'string' ? contentBase : Array.isArray(contentBase) ? contentBase.join(', ') : ''
    if (folders) {
      message.info(`Static resources not from webpack is served from ${chalk.cyan(folders)}`)
    }

    if (devServerConfig.proxy) {
      const proxyInfo = proxyInfomation(devServerConfig.proxy as ProxyConfig)
      if (proxyInfo) {
        message.info(`Other HTTP requests will proxy to Proxy-Server base on:\n ${chalk.cyan(proxyInfo)}`)
      }
    }

    if (isEelectron) {
      message.info(`Call ${chalk.cyan('`electron .`')} to setup development APP`)
      openByElectron()
    } else {
      opener(urls.localUrlForBrowser)
    }
  })
  ;['SIGINT', 'SIGTERM'].forEach(sig => {
    process.on(sig as NodeJS.Signals, () => {
      devServer.close()
      process.exit()
    })
  })
}
