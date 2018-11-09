import url from 'url'
import address from 'address'
import chalk from 'chalk'
import { execSync } from 'child_process'
import path from 'path'
import { OutputFileSystem } from 'webpack'

export function shouldUseYarn() {
  try {
    execSync('yarnpkg --version', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/**
 * transform ',' separated string to string[]
 * @param str
 */
export function transformString2Array(str: string): string[] {
  return str.split(',')
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
