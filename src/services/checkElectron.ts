import chalk from 'chalk'
import { isModuleExistsInCwd, message } from '../utils'

export default function checkElectron() {
  if (!isModuleExistsInCwd('electron')) {
    message.error(
      `Please install Electron: ${chalk.cyan('`yarn add electron -D`')} or ${chalk.cyan(
        '`npm i electron --save-dev`',
      )}`,
    )
    process.exit(1)
  }
}
