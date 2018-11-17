import path from 'path'
import fs from 'fs-extra'
import { writeJSON } from '../../utils'
import { Generator } from './type'

const genVscodeSettings: Generator = (appPath: string, ownPath: string, ownPkg: { [key: string]: any }) => {
  const vscodeSettingsDir = path.join(appPath, '.vscode')
  const vscodeSettingsPath = path.join(vscodeSettingsDir, 'settings.json')
  if (fs.existsSync(vscodeSettingsPath)) {
    return
  }

  const settings = {
    // options auto completions
    'json.schemas': [
      {
        fileMatch: ['package.json'],
        url: `./node_modules/${ownPkg.name}/lib/package.option.schema.json`,
      },
    ],
  }

  fs.ensureDirSync(vscodeSettingsDir)
  writeJSON(vscodeSettingsPath, settings)
}

export default genVscodeSettings
