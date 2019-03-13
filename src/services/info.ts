import { readJsonSync } from 'fs-extra'
import { resolveModuleInCwd, isModuleExistsInCwd } from '../utils'

export default function showInfo() {
  const modules = ['typescript', 'react', 'react-dom']
  return modules
    .filter(isModuleExistsInCwd)
    .map(name => {
      const pkgPath = resolveModuleInCwd(`${name}/package.json`)
      const pkg = readJsonSync(pkgPath)
      return `${name}: ${pkg.version}`
    })
    .join(', ')
}
