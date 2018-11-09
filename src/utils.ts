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
