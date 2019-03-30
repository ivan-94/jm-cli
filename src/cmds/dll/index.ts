import paths from '../../paths'
import getOptions from '../../options'
import { message } from '../../utils'
import { CommonOption } from '../type'
import generateDll from './generateDll'

export interface DllOption extends CommonOption {}

const mode = 'development'
const pkg = require(paths.appPackageJson)

process.env.NODE_ENV = mode

require('../../env')

export default async (argv: DllOption) => {
  const environment = require('../../env').default()
  const jmOptions = getOptions(pkg)
  if (jmOptions == null) {
    return
  }

  if (environment.raw.DISABLE_DLL === 'true') {
    message.warn('DISABLE_DLL have set. Webpack DLL references will be disabled')
  }

  try {
    await generateDll(environment, pkg, paths, { inspect: argv.inspect, jmOptions })
  } catch {
    process.exit(-1)
  }
}
