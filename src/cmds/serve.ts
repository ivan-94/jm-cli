/**
 * serve builded content in dist
 */
import fs from 'fs-extra'
import opener from 'opener'
import express from 'express'
import chalk from 'chalk'
import https from 'https'
import http from 'http'
import { interpolateProxy, applyProxyToExpress, proxyInfomation } from '../proxy'
import paths from '../paths'
import { clearConsole, shouldUseYarn, choosePort, prepareUrls, inspect } from '../utils'
import { getCerts } from '../cert'
import getOptions from '../options'
import { CommonOption } from './type'

export interface ServeOption extends CommonOption {
  gzip?: boolean
  cors?: boolean
  open?: boolean
  f?: boolean
}

const mode = 'production'
const useYarn = shouldUseYarn()
process.env.NODE_ENV = mode

// initial env
require('../env')

function checkDist() {
  const distPath = paths.appDist
  if (!fs.existsSync(distPath) || fs.readdirSync(distPath, { withFileTypes: true }).length === 0) {
    console.log(
      chalk.red(
        `❌ Error: dist ${chalk.cyan(distPath)} is empty. Call ${chalk.green(
          useYarn ? `yarn build` : 'npm build',
        )} to build bundle for production.`,
      ),
    )
    process.exit(1)
    return ''
  }
  return distPath
}

export default async (argv: ServeOption) => {
  const dist = checkDist()
  const environment = require('../env').default()
  const pkg = require(paths.appPackageJson)
  const jmOptions = getOptions(pkg, paths.ownLib)
  if (jmOptions == null) {
    return
  }
  const proxy = jmOptions.proxy ? interpolateProxy(jmOptions.proxy, environment.raw) : undefined
  const port = await choosePort(parseInt(environment.raw.PORT, 10) || 8080)
  const protocol = environment.raw.HTTPS === 'true' ? 'https' : 'http'
  const host = '0.0.0.0'

  if (argv.inspect) {
    inspect(environment.raw, 'Environment')
    inspect(
      {
        gzip: argv.gzip,
        protocol,
        host,
        port,
        proxy,
      },
      'Server Config',
    )
    return
  }

  clearConsole()
  console.log(chalk.cyan(`Starting server...`))
  const app = express()

  if (argv.gzip) {
    app.use(require('compression')())
  }

  if (argv.cors) {
    app.use(require('cors')())
  }

  // serve static files
  app.use(express.static(dist))

  if (proxy) {
    applyProxyToExpress(proxy, app)
  }

  if (argv.f) {
    app.use(require('connect-history-api-fallback')())
  }

  const callback = (err: Error) => {
    if (err != null) {
      console.log(err)
      return
    }

    const urls = prepareUrls(protocol, host, port)
    console.log(`Server running at ${chalk.cyan(urls.lanUrlForTerminal || urls.localUrlForTerminal)}`)
    console.log(`Static resources is served from ${chalk.cyan(dist)}`)
    if (proxy) {
      const proxyInfo = proxyInfomation(proxy)
      if (proxyInfo) {
        console.log(`Other HTTP requests will proxy to Proxy-Server base on:\n ${chalk.cyan(proxyInfo)}`)
      }
    }

    if (argv.open) {
      opener(urls.localUrlForBrowser)
    }
  }

  let listeningServer: https.Server | http.Server

  if (protocol === 'https') {
    const { key, cert } = getCerts()
    listeningServer = https
      .createServer(
        {
          key,
          cert,
        },
        app,
      )
      .listen(port, host, callback)
  } else {
    listeningServer = app.listen(port, host, callback)
  }

  ;['SIGINT', 'SIGTERM'].forEach(sig => {
    process.on(sig as NodeJS.Signals, () => {
      listeningServer.close()
      process.exit()
    })
  })
}
