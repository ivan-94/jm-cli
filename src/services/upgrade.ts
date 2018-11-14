/**
 * upgrade services
 */
import { execSync } from 'child_process'
import fs from 'fs-extra'
import semver from 'semver'
import chalk from 'chalk'
import path from 'path'

export type SemverLevel = 'major' | 'minor' | 'patch'

export function getMaxSatisfying(packageName: string, range: string) {
  let version = JSON.parse(execSync(`npm view "${packageName}@${range}" version --json`).toString())

  if (Array.isArray(version)) {
    version = version.sort(semver.compare)[version.length - 1]
  }

  return version
}

/**
 *
 * @param packageName
 * @param verison sepecific version
 * @param semverLevel
 */
export function getUpgradableVersion(
  packageName: string,
  verison: string,
  semverLevel: SemverLevel,
): [string, boolean, string] {
  let newRange: string
  let upgradable: boolean
  let newMaxVersion: string
  if (semverLevel === 'patch') {
    newRange = `~${verison}`
    newMaxVersion = getMaxSatisfying(packageName, newRange)
    newRange = `~${newMaxVersion}`
  } else if (semverLevel === 'minor') {
    newRange = `^${verison}`
    newMaxVersion = getMaxSatisfying(packageName, newRange)
    newRange = `^${newMaxVersion}`
  } else {
    newMaxVersion = getMaxSatisfying(packageName, 'latest')
    newRange = `^${newMaxVersion}`
  }

  upgradable = newMaxVersion !== verison
  return [newRange, upgradable, newMaxVersion]
}

export function getYarnGlobalInstallPackages() {
  const list: { [name: string]: string } = {}
  execSync('yarn global list -s --json --no-progress')
    .toString()
    .split('\n')
    .map<{ type: 'info' | 'list'; data: string }>(info => (info.trim() === '' ? {} : JSON.parse(info)))
    .filter(i => i.type === 'info')
    .forEach(i => {
      const matched = i.data.match(/^"(.*)@(.*)"/)
      if (matched) {
        list[matched[1]] = matched[2]
      }
    })
  return list
}

export function getNpmGlobalInstallPackages() {
  const list: { [name: string]: string } = {}
  const data = JSON.parse(execSync('npm list -g --depth=0 --json').toString()) as {
    dependencies: { [name: string]: { version: string } }
  }
  Object.keys(data.dependencies).forEach(key => {
    list[key] = data.dependencies[key].version
  })
  return list
}

export function getLocalVersion(name: string): string {
  const packagePath = path.join(process.cwd(), 'package.json')
  if (!fs.existsSync(packagePath)) {
    throw new Error('package.json not existed in current directory.')
  } else {
    let pkg = fs.readJsonSync(packagePath)
    if (pkg.devDependencies == null || !(name in pkg.devDependencies)) {
      throw new Error(`${chalk.cyan(name)} not installded on local project`)
    }
    const ownPkgPath = path.join(process.cwd(), 'node_modules', name, 'package.json')
    return fs.readJSONSync(ownPkgPath).version
  }
}
