/**
 * getOptions from package.json
 */
import Ajv, { AjvError } from 'ajv'
import betterAjvErrors from 'better-ajv-errors'
import fs from 'fs-extra'
import os from 'os'
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
  proxy?: ProxyConfig
  importPlugin?: ImportPluginConfig | ImportPluginConfig[]
  enableDuplicatePackageCheck: boolean
  enableCircularDependencyCheck: boolean
  happypack: boolean
}

const defaultOptions: JMOptions = {
  enableDuplicatePackageCheck: true,
  enableCircularDependencyCheck: true,
  happypack: os.cpus().length > 1,
}
const key = 'jm'

export default function getOptions(pkg: { [key: string]: any }, dir: string): JMOptions | undefined {
  const schemaPath = path.join(dir, 'option.schema.json')
  const schema = fs.readJsonSync(schemaPath)
  if (key in pkg) {
    const ajv = new Ajv({ jsonPointers: true })
    const validate = ajv.compile(schema)
    if (validate(pkg[key])) {
      return { ...defaultOptions, ...pkg[key] }
    }
    const errors = prepareErrors(validate.errors)
    const output = betterAjvErrors(schema, pkg[key], errors, { indent: 2 })
    console.log(
      chalk.red(`❌  Configuration error. Check property ${chalk.cyan(key)} of the ${chalk.cyan('package.json')}`),
    )
    console.log(output)
    process.exit(1)
    return
  } else {
    return defaultOptions
  }
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
