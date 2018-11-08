import { execSync } from 'child_process'

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