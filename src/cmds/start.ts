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
import { prepareUrls, inspect, interpolate } from '../utils'
import paths from '../paths'
import { CommonOption, ProxyContext, ProxyConfig, ProxyOriginConfig, ProxyMap } from './type'

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
 * shorthand like proxy: 'http://www.example.org:8000/api'); => proxy('/api', {target: 'http://www.example.org:8000'});
 * object like proxy: {"/context": {target: 'http://www.example.com'}} or {"/context": {target: 'http://www.example.com'}
 * array like: [{context: string, target: string}]
 * @param proxy
 */
function interpolateProxy(proxy: ProxyConfig, local: { [key: string]: string }): ProxyConfig {
  if (typeof proxy === 'string') {
    return interpolate(proxy, local)
  } else if (Array.isArray(proxy)) {
    return proxy.map(i => interpolateProxy(i, local)) as ProxyConfig
  } else if (typeof proxy === 'object' && 'context' in proxy) {
    proxy = proxy as ProxyOriginConfig
    const context = proxy.context
    return {
      ...proxy,
      context: Array.isArray(context)
        ? context.map(i => interpolate(i, local))
        : typeof context === 'string'
        ? interpolate(context, local)
        : context,
      target: interpolate(proxy.target as string, local),
    }
  } else if (typeof proxy === 'object') {
    const res: ProxyConfig = {}
    Object.keys(proxy).forEach(context => {
      const value = (proxy as ProxyMap)[context]
      res[interpolate(context, local)] =
        typeof value === 'string'
          ? interpolate(value, local)
          : {
              ...value,
              target: interpolate(value.target, local),
            }
    })
    return res
  }

  return proxy
}

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

  console.log(chalk.cyan('Starting the development server...\n'))
  const port = await choosePort(parseInt(process.env.PORT as string, 10) || 8080)
  const protocol = process.env.HTTPS === 'true' ? 'https' : 'http'
  const host = '0.0.0.0'

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
