import { execSync } from 'child_process'

export function shouldUseYarn() {
  try {
    execSync('yarnpkg --version', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}
