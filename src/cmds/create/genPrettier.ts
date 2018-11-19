import path from 'path'
import fs from 'fs-extra'
import { Generator } from './type'

const genPrettier: Generator = (appPath: string, ownPath: string, pkg: { [key: string]: any }) => {
  const legalPrettierConfigName = [
    '.prettierrc',
    '.prettierrc.json',
    'prettier.config.js',
    '.prettierrc.yaml',
    '.prettierrc.toml',
    '.prettierrc.yml',
  ]

  for (let file of legalPrettierConfigName) {
    if (fs.existsSync(path.join(appPath, file))) {
      return
    }
  }

  fs.copyFileSync(path.join(ownPath, '.prettierrc'), path.join(appPath, '.prettierrc'))
  fs.copyFileSync(path.join(ownPath, 'lib/prettierignore'), path.join(appPath, '.prettierignore'))
}

export default genPrettier
