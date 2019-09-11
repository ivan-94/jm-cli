/**
 * getOptions from package.json
 */
import Ajv, { AjvError } from 'ajv'
import betterAjvErrors from 'better-ajv-errors'
import fs from 'fs-extra'
import path from 'path'
import groupBy from 'lodash/groupBy'
import { ProxyConfig } from './proxy'
import chalk from 'chalk'

export interface ImportPluginConfig {
  libraryName: string
  style?: 'css' | boolean
  libraryDirectory?: boolean
  camel2DashComponentName?: boolean
}

export interface JMOptions {
  electron?: boolean
  proxy?: ProxyConfig
  importPlugin?: ImportPluginConfig | ImportPluginConfig[]
  enableDuplicatePackageCheck: boolean
  enableTypescriptCheck: boolean
  enableCircularDependencyCheck: boolean
  enableDllInProduction?: boolean
  enableESlintInProduction?: boolean
  useBuiltIns: 'entry' | 'usage' | false
  alias?: { [key: string]: string }
  electronExternalsWhitelist?: string[]
  dll?: {
    include?: string[]
    exclude?: string[]
  }
}

const defaultOptions: JMOptions = {
  enableDuplicatePackageCheck: false,
  enableTypescriptCheck: true,
  enableESlintInProduction: false,
  enableCircularDependencyCheck: false,
  useBuiltIns: 'usage',
}
const key = 'jm'

let options: JMOptions | undefined
export default function getOptions(pkg: { [key: string]: any }): JMOptions {
  if (options) {
    return options
  }

  const schemaPath = path.join(__dirname, '../lib/option.schema.json')
  const schema = fs.readJsonSync(schemaPath)
  if (key in pkg) {
    const ajv = new Ajv({ jsonPointers: true })
    const validate = ajv.compile(schema)
    if (validate(pkg[key])) {
      return (options = { ...defaultOptions, ...pkg[key] })
    }
    const errors = prepareErrors(validate.errors)
    const output = betterAjvErrors(schema, pkg[key], errors, { indent: 2 })
    console.log(
      chalk.red(`❌  Configuration error. Check property ${chalk.cyan(key)} of the ${chalk.cyan('package.json')}`),
    )
    console.log(output)
    process.exit(1)
  }

  return (options = defaultOptions)
}

function prepareErrors(errors: AjvError[]) {
  const removeKeywords = ['anyOf', 'oneOf']
  const newErrors = errors.filter(i => removeKeywords.indexOf(i.keyword) === -1)
  // merge same path error
  const groups = groupBy(newErrors, 'dataPath')
  return Object.keys(groups)
    .map(k => {
      return {
        ...groups[k][0],
        message: groups[k].map(i => i.message).join(' or '),
      }
    })
    .reduce<AjvError[]>((all, cur) => {
      const index = all.findIndex(i => i.dataPath.startsWith(cur.dataPath) || cur.dataPath.startsWith(i.dataPath))
      if (index !== -1) {
        const existed = all[index]
        // has more specific error
        if (existed.dataPath.length > cur.dataPath.length) {
          return all
        }
        all.splice(index, 1, cur)
      } else {
        all.push(cur)
      }

      return all
    }, [])
}
