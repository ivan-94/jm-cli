import url from 'url'
import { dump } from 'dumper.js'
import os from 'os'
import fs from 'fs-extra'
import address from 'address'
import chalk from 'chalk'
import detectPort from 'detect-port'
import { execSync } from 'child_process'
import path from 'path'
import { OutputFileSystem } from 'webpack'

export const IS_CI = process.env.CI === 'true'

export function shouldUseYarn() {
  try {
    execSync('yarnpkg --version', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

export async function choosePort(defaultPort: number) {
  const port = await detectPort(defaultPort)
  if (port !== defaultPort) {
    console.log(
      chalk.yellow(`⚠️  Default Port(${chalk.red(':' + defaultPort)}) was occupied, trying ${chalk.green(':' + port)}`),
    )
  }
  return port
}

/**
 * transform ',' separated string to string[]
 * @param str
 */
export function transformString2Array(str: string): string[] {
  return str.split(',')
}

/**
 * transform --group.foo=a,b or --group=a,b --group=b,c
 */
export function transformGroup(argv: string | string[] | { [key: string]: string }) {
  if (Array.isArray(argv)) {
    return argv.reduce<StringArrayObject>((group, cur) => {
      const entry = transformString2Array(cur)
      const name = entry.join('_')
      group[name] = entry
      return group
    }, {})
  } else if (typeof argv === 'string') {
    return { default: transformString2Array(argv) }
  }

  return Object.keys(argv).reduce<StringArrayObject>((group, cur) => {
    group[cur] = transformString2Array(argv[cur])
    return group
  }, {})
}

export function writeJSON(path: string, data: object) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2) + os.EOL)
}

/**
 * clear teminater
 */
export function clearConsole() {
  if (process.stdout.isTTY) {
    process.stdout.write(process.platform === 'win32' ? '\x1B[2J\x1B[0f' : '\x1B[2J\x1B[3J\x1B[H')
  }
}

/**
 * null device
 */
const noop = (path: string, callback: (err: Error | undefined | null) => void) => callback(null)
export const noopFileSystem: OutputFileSystem = {
  join: (...paths: string[]) => path.join(...paths),
  mkdir: noop,
  mkdirp: noop,
  rmdir: noop,
  unlink: noop,
  writeFile: (path: string, data: any, callback: (err: any) => void) => callback(null),
}

// copy from react-dev-utils
export function prepareUrls(protocol: string, host: string, port: number) {
  const formatUrl = (hostname: string) =>
    url.format({
      protocol,
      hostname,
      port,
      pathname: '/',
    })
  const prettyPrintUrl = (hostname: string) =>
    url.format({
      protocol,
      hostname,
      port: chalk.bold(port.toString()),
      pathname: '/',
    })

  const isUnspecifiedHost = host === '0.0.0.0' || host === '::'
  let prettyHost, lanUrlForConfig, lanUrlForTerminal
  if (isUnspecifiedHost) {
    prettyHost = 'localhost'
    try {
      // This can only return an IPv4 address
      lanUrlForConfig = address.ip()
      if (lanUrlForConfig) {
        // Check if the address is a private ip
        // https://en.wikipedia.org/wiki/Private_network#Private_IPv4_address_spaces
        if (/^10[.]|^172[.](1[6-9]|2[0-9]|3[0-1])[.]|^192[.]168[.]/.test(lanUrlForConfig)) {
          // Address is private, format it for later use
          lanUrlForTerminal = prettyPrintUrl(lanUrlForConfig)
        } else {
          // Address is not private, so we will discard it
          lanUrlForConfig = undefined
        }
      }
    } catch (_e) {
      // ignored
    }
  } else {
    prettyHost = host
  }
  const localUrlForTerminal = prettyPrintUrl(prettyHost)
  const localUrlForBrowser = formatUrl(prettyHost)
  return {
    lanUrlForConfig,
    lanUrlForTerminal,
    localUrlForTerminal,
    localUrlForBrowser,
  }
}

export function inspect(variable: any, title?: string) {
  if (title) {
    console.log(chalk.bgBlue(title))
  }
  dump(variable)
  console.log('\n\n')
}

export function isModuleExistsInCwd(name: string) {
  try {
    const cwdNodeModules = path.join(process.cwd(), 'node_modules')
    if (!fs.existsSync(cwdNodeModules)) {
      return false
    }
    return !!require.resolve(name, {
      paths: [cwdNodeModules],
    })
  } catch {
    return false
  }
}

export function resolveModuleInCwd(name: string) {
  const cwdNodeModules = path.join(process.cwd(), 'node_modules')
  return require.resolve(name, { paths: [cwdNodeModules] })
}

export function requireInCwd(name: string) {
  return require(resolveModuleInCwd(name))
}

/**
 * interpolate ${variable} in string
 */
export function interpolate(str: string, local: { [key: string]: string }) {
  if (str == null) {
    return ''
  }

  const matches = str.match(/\$([a-zA-Z0-9_]+)|\${([a-zA-Z0-9_]+)}/g) || []

  matches.forEach(function(match) {
    const key = match.replace(/\$|{|}/g, '')
    let variable = local[key] || ''
    // Resolve recursive interpolations
    variable = interpolate(variable, local)

    str = str.replace(match, variable)
  })

  return str
}

export const logSymbols = {
  success: chalk.bgGreen(chalk.white(' DONE ')),
  error: chalk.bgRed(chalk.white(' FAIL ')),
  warn: chalk.bgYellow(chalk.white(' WARN ')),
  info: chalk.bgBlue(chalk.white(' INFO ')),
}

export const message = {
  success: (text: string) => {
    console.log(logSymbols.success + ' ' + text)
  },
  error: (text: string) => {
    console.log(logSymbols.error + ' ' + text)
  },
  warn: (text: string) => {
    console.log(logSymbols.warn + ' ' + text)
  },
  info: (text: string) => {
    console.log(logSymbols.info + ' ' + text)
  },
}
