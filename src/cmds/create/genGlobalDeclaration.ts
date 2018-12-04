import fs from 'fs-extra'
import path from 'path'
import { Generator } from './type'
import { message } from '../../utils'

const initialGlobalDeclaration: Generator = (appPath: string, ownPath: string, ownPkg: { [key: string]: any }) => {
  const declarationPath = path.join(appPath, 'global.d.ts')
  const refStr = `/// <reference types="${ownPkg.name}" />`
  if (!fs.existsSync(declarationPath)) {
    fs.writeFileSync(declarationPath, refStr + '\n')
    message.info('created typescript global declaration file')
    return
  }

  let content = fs.readFileSync(declarationPath).toString()
  if (content.indexOf(refStr) === -1) {
    content = refStr + '\n' + content
    fs.writeFileSync(declarationPath, content)
  }
}

export default initialGlobalDeclaration
