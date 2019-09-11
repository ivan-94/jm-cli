import fs from 'fs-extra'
import path from 'path'
import { writeJSON, message } from '../../utils'
import { Generator } from './type'

/**
 * 生产eslint配置文件
 * @param appPath
 * @param ownPath
 * @param ownPkg
 */
const genESLintConfig: Generator = (appPath, ownPath, ownPkg) => {
  const esLintConfigPath = path.join(appPath, '.eslintrc.json')

  if (fs.existsSync(esLintConfigPath)) {
    return
  } else {
    writeJSON(esLintConfigPath, {
      extends: ['@gdjiami/eslint-config'],
    })
    message.info('created .eslintrc.json')
  }
}

export default genESLintConfig
