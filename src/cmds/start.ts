/**
 * Start development server
 */
import { execSync } from 'child_process'
import path from 'path'
import webpackDevServer, { Configuration } from 'webpack-dev-server'
import { Configuration as WebpackConfiguration } from 'webpack'
import paths from '../paths'
import webpack = require('webpack')
import chalk from 'chalk'

process.on('unhandledRejection', err => {
  throw err
})

const mode = 'development'
process.env.NODE_ENV = mode

// initial enviroments variables
require('../env')

/**
 * get webpack-dev-options
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
    // quiet: true,
    watchOptions: {
      ignored: /node_modules/,
    },
    https: process.env.HTTPS === 'true',
    proxy,
  }
}

export default async function(cwd: string, originalDirname: string, argv: { entry?: string[] }) {
  // TODO: 检查是否是react项目
  // TODO: 依赖检查
  // TODO: 选择端口
  // TODO: 打开浏览器
  const port = parseInt(process.env.PORT as string, 10) || 8080
  const protocol = process.env.HTTPS === 'true' ? 'https' : 'http'
  const host = '0.0.0.0'
  const environment = require('../env').default()
  const pkg = require(paths.appPackageJson)
  const config = require('../config').default(environment, pkg, paths, { entry: argv.entry })
  const compiler = webpack(config)
  const devServerConfig = getDevServerConfig(pkg.proxy || {}, config)
  const devServer = new webpackDevServer(compiler, devServerConfig)

  devServer.listen(port, host, err => {
    if (err) {
      return console.log(err)
    }

    console.log(chalk.cyan('Starting the development server...\n'))
  })
  ;['SIGINT', 'SIGTERM'].forEach(sig => {
    process.on(sig as NodeJS.Signals, () => {
      devServer.close()
      process.exit()
    })
  })
}
