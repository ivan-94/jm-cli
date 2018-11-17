import fs from 'fs-extra'
import json5 from 'json5'
import path from 'path'
import { writeJSON } from '../../utils'
import { Generator } from './type'

const genTsLintConfig: Generator = (appPath, ownPath, ownPkg) => {
  const tsLintConfigPath = path.join(appPath, 'tslint.json')
  const builinTsLintConfigPath = path.posix.join(ownPkg.name, 'lib/tslint.json')

  if (fs.existsSync(tsLintConfigPath)) {
    const config = json5.parse(fs.readFileSync(tsLintConfigPath).toString()) as {
      extends?: string | string[]
      defaultSeverity?: string
    }
    let dirty: boolean = false
    if (config.extends) {
      if (typeof config.extends === 'string' && config.extends !== builinTsLintConfigPath) {
        config.extends = [builinTsLintConfigPath, config.extends]
        dirty = true
      } else if (config.extends.indexOf(builinTsLintConfigPath) === -1) {
        ;(config.extends as string[]).unshift(builinTsLintConfigPath)
        dirty = true
      }
    }

    if (config.defaultSeverity && config.defaultSeverity !== 'warning') {
      config.defaultSeverity = 'warning'
      dirty = true
    }

    if (dirty) {
      writeJSON(tsLintConfigPath, config)
    }
  } else {
    writeJSON(tsLintConfigPath, {
      extends: [builinTsLintConfigPath],
    })
  }
}

export default genTsLintConfig
