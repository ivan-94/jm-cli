/**
 * Start development server
 */
import webpackDevServer, { Configuration } from 'webpack-dev-server'
import webpack, { Configuration as WebpackConfiguration, Compiler } from 'webpack'
import formatMessages from 'webpack-format-messages'
import readline from 'readline'
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
  autoReload?: boolean
  electronInspect?: number
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
function createCompiler(
  config: WebpackConfiguration,
  electronMainConfig?: WebpackConfiguration,
  onCompileSuccess?: (stat: webpack.Stats) => void,
): [Compiler, () => void] {
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
  const startSpin = () => {
    spinner.text = 'Compiling...'
    spinner.start()
  }

  compiler!.hooks.invalid.tap('invalid', () => {
    clearConsole()
    startSpin()
  })

  compiler!.hooks.done.tap('done', stats => {
    spinner.stop()
    const messages = formatMessages(stats)
    if (messages.errors.length) {
      message.error('Failed to compile.\n\n')
      messages.errors.forEach(e => console.log(e))
      return
    }

    if (onCompileSuccess) {
      onCompileSuccess(stats)
    }

    if (messages.warnings.length) {
      message.warn('Compiled with warnings.\n\n')
      messages.warnings.forEach(e => console.log(e))
      return
    }

    message.success(chalk.green('Compiled successfully.'))
  })

  return [compiler!, startSpin]
}

function log(str: string, color: string, title: string) {
  if (/[0-9A-z]+/.test(str)) {
    message.custom(title, str, color)
  }
}

let restartingElectron = false
/**
 * 打开electron 实例
 * @param prevProcess
 */
function openByElectron(argv: StartOption, prevProcess?: ch.ChildProcess) {
  if (prevProcess && prevProcess.kill) {
    try {
      restartingElectron = true
      process.kill(prevProcess.pid)
      setTimeout(() => {
        restartingElectron = false
      }, 5000)
    } catch {}
  }

  const p = ch.spawn(requireInCwd('electron'), [argv.electronInspect ? `--inspect=${argv.electronInspect}` : '', '.'])
  const stdin = readline.createInterface({ input: p.stdout })
  const stderr = readline.createInterface({ input: p.stderr })

  stdin.on('line', data => {
    log(data, 'cyan', 'Electron Log')
  })
  stderr.on('line', data => {
    log(data, 'red', 'Electron Log')
  })

  // electron 主进程退出
  p.on('close', () => {
    if (!restartingElectron) {
      message.info('Electron 主进程退出, 停止运行')
      process.exit()
    }
  })

  return p
}

export default async function(argv: StartOption) {
  // port 选择
  const port = await choosePort(parseInt(process.env.PORT as string, 10) || 8080)
  const protocol = process.env.HTTPS === 'true' ? 'https' : 'http'
  const host = '0.0.0.0'
  const urls = prepareUrls(protocol, host, port)
  process.env.PORT = port.toString()
  process.env.ADDRESS = urls.lanUrlForConfig || 'localhost'
  process.env.PROTOCOL = protocol

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
    // TODO: 优化展示，使用fx，交互式
    inspect(jmOptions, 'CLI Options:')
    inspect(environment.raw, 'Environment:')
    inspect(devServerConfig, 'Development Server Config:')
    inspect(config, 'Webpack Configuration:')
    return
  }

  const spinner = new Ora({ text: 'Starting the development server...\n' }).start()
  const contentBase = devServerConfig.contentBase
  const folders =
    typeof contentBase === 'string' ? contentBase : Array.isArray(contentBase) ? contentBase.join(', ') : ''
  const proxyInfo = devServerConfig.proxy && proxyInfomation(devServerConfig.proxy as ProxyConfig)
  let electronOrBrowserProcess: ch.ChildProcess | undefined
  let lastElectronMainBuildTime: number | undefined

  const [compiler, startCompileSpin] = createCompiler(config, electronMainConfig, stats => {
    message.info(showInfo())
    message.info(
      `Development server running at: \n    Lan: ${chalk.cyan(urls.lanUrlForTerminal!)}\n    Local: ${chalk.cyan(
        urls.localUrlForTerminal,
      )} `,
    )
    message.info(`Webpack output is served from ${chalk.cyan('/')}`)
    if (folders) {
      message.info(`Static resources not from webpack is served from ${chalk.cyan(folders)}`)
    }

    if (proxyInfo) {
      message.info(`Other HTTP requests will proxy to Proxy-Server base on:\n ${chalk.cyan(proxyInfo)}`)
    }

    if (isEelectron) {
      message.info(`Call ${chalk.cyan('`electron .`')} to setup development APP`)
    }

    try {
      if (isEelectron) {
        const compilerStat = ((stats as any) as { stats: webpack.Stats[] }).stats
        // @ts-ignore
        const mainStat = compilerStat.find(i => i.compilation.name === 'main')
        const buildTime = (mainStat!.startTime as any) as number

        if (electronOrBrowserProcess == null) {
          message.info('open Electron')
          electronOrBrowserProcess = openByElectron(argv)
        } else if (argv.autoReload && lastElectronMainBuildTime !== buildTime) {
          // electron 主进程更新时重启
          message.info('restart Electron')
          electronOrBrowserProcess = openByElectron(argv, electronOrBrowserProcess)
        }

        lastElectronMainBuildTime = buildTime
      } else if (electronOrBrowserProcess == null) {
        // 打开浏览器
        const entries = Object.keys(config.entry as { [key: string]: string })
        const entry = entries.some(i => i === 'index') ? 'index' : entries[0]
        electronOrBrowserProcess = opener(`${urls.localUrlForBrowser}/${entry}.html`)
      }
    } catch (err) {
      message.error(err)
    }
  })

  const devServer = new webpackDevServer(compiler, devServerConfig)

  devServer.listen(port, host, err => {
    spinner.stop()
    if (err) {
      message.error('Fail to setup development server:')
      console.log(message)
      return
    }
    setTimeout(() => {
      startCompileSpin()
    }, 1000)
  })
  ;['SIGINT', 'SIGTERM'].forEach(sig => {
    process.on(sig as NodeJS.Signals, () => {
      devServer.close()
      process.exit()
    })
  })
}
