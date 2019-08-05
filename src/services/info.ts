import { readJsonSync } from 'fs-extra'
import path from 'path'
import { resolveModuleInCwd, isModuleExistsInCwd } from '../utils'

const pkg = require(path.join(__dirname, '../../package.json'))

export default function showInfo() {
  const modules = ['typescript', 'react', 'react-dom', 'electron', 'webpack']
  return (
    `jm-cli: ${pkg.version} ` +
    modules
      .filter(isModuleExistsInCwd)
      .map(name => {
        const pkgPath = resolveModuleInCwd(`${name}/package.json`)
        const pkg = readJsonSync(pkgPath)
        return `${name}: ${pkg.version}`
      })
      .join(', ')
  )
}
