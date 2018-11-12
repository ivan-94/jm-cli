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
import { prepareUrls, inspect, clearConsole } from '../utils'
import { interpolateProxy, proxyInfomation, ProxyConfig } from '../proxy'
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
    clearConsole()
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
  clearConsole()
  console.log(chalk.cyan('Starting the development server...\n'))
  // TODO: 检查是否是react项目
  // TODO: 依赖检查
  const environment = require('../env').default()
  const pkg = require(paths.appPackageJson)
  const config = require('../config').default(environment, pkg, paths, { entry: argv.entry })
  const devServerConfig = getDevServerConfig(pkg.proxy || {}, config, environment.raw)

  if (argv.inspect) {
    inspect(environment.raw, 'Environment:')
    inspect(devServerConfig, 'Development Server Config:')
    inspect(config, 'Webpack Configuration:')
    return
  }

  const compiler = createCompiler(config)
  const devServer = new webpackDevServer(compiler, devServerConfig)

  const port = await choosePort(parseInt(process.env.PORT as string, 10) || 8080)
  const protocol = process.env.HTTPS === 'true' ? 'https' : 'http'
  const host = '0.0.0.0'

  devServer.listen(port, host, err => {
    if (err) {
      return console.log(err)
    }

    const urls = prepareUrls(protocol, host, port)
    console.log(`Development server running at ${chalk.cyan(urls.lanUrlForTerminal || urls.localUrlForTerminal)}`)
    console.log(`Webpack output is served from ${chalk.cyan('/')}`)
    const contentBase = devServerConfig.contentBase
    const folders =
      typeof contentBase === 'string' ? contentBase : Array.isArray(contentBase) ? contentBase.join(', ') : ''
    if (folders) {
      console.log(`Static resources not from webpack is served from ${chalk.cyan(folders)}`)
    }

    if (devServerConfig.proxy) {
      const proxyInfo = proxyInfomation(devServerConfig.proxy as ProxyConfig)
      if (proxyInfo) {
        console.log(`Other HTTP requests will proxy to Proxy-Server base on:\n ${chalk.cyan(proxyInfo)}`)
      }
    }

    opener(urls.localUrlForBrowser)
  })
  ;['SIGINT', 'SIGTERM'].forEach(sig => {
    process.on(sig as NodeJS.Signals, () => {
      devServer.close()
      process.exit()
    })
  })
}
