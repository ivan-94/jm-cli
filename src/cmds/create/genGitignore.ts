import path from 'path'
import fs from 'fs-extra'
import { Generator } from './type'
import { message } from '../../utils'

function createGitIgnore(appPath: string, ownPath: string) {
  const dotIgnorePath = path.join(appPath, '.gitignore')
  const ignorePath = path.join(appPath, 'gitignore')

  if (fs.existsSync(dotIgnorePath)) {
    return
  }

  if (fs.existsSync(ignorePath)) {
    fs.moveSync(ignorePath, dotIgnorePath)
    return
  }

  const defaultIgnorePath = path.join(ownPath, 'lib/gitignore')
  fs.copySync(defaultIgnorePath, dotIgnorePath)
  message.info('created .gitignore')
}

function createGitAttribute(appPath: string, ownPath: string) {
  const dotGitAttributesPath = path.join(appPath, '.gitattributes')

  if (fs.existsSync(dotGitAttributesPath)) {
    return
  }

  const defaultGitAttributesPath = path.join(ownPath, 'lib/gitattributes')
  fs.copySync(defaultGitAttributesPath, dotGitAttributesPath)
  message.info('create .gitattributes')
}

const genGitignore: Generator = (appPath, ownPath) => {
  createGitIgnore(appPath, ownPath)
  createGitAttribute(appPath, ownPath)
}

export default genGitignore
