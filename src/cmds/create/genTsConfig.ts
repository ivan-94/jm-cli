import path from 'path'
import fs from 'fs-extra'
import { Generator } from './type'
import { message } from '../../utils'

/**
 * 初始化tsconfig.json
 * TODO: 目前tsconfig.json 不支持extends node_modules 中的配置. 而且baseurl和rootDir都是相对tsconfi.json所在的位置
 */
const genTsConfig: Generator = (appPath, ownPath, ownPkg) => {
  const tsConfigPath = path.join(appPath, 'tsconfig.json')
  const builinTsConfigPath = path.join(ownPath, 'lib/tsconfig.json')

  if (fs.existsSync(tsConfigPath)) {
    return
  }

  fs.copyFileSync(builinTsConfigPath, tsConfigPath)
  message.info('created tsconfig.json')
}

export default genTsConfig
