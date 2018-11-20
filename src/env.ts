/**
 * 初始化环境变量
 */
import fs from 'fs-extra'
import paths from './paths'
import chalk from 'chalk'
import dotenv from 'dotenv'

export interface WebpackEnviroment {
  raw: StringObject
  userDefine: StringObject
  stringified: { [key: string]: object }
}

// 确保后续require paths, 可以读取到.env加载的环境变量
delete require.cache[require.resolve('./paths')]
const NODE_ENV = process.env.NODE_ENV
if (!NODE_ENV) {
  console.error(`The ${chalk.blue('NODE_ENV')} environment variable is required.`)
  process.exit()
}

// .env 文件, 优先加载.env.*.local, 再加载.env.*, 最后是.env, .env.local
const dotenvsFiles = [
  `${paths.appDotenv}`,
  `${paths.appDotenv}.${NODE_ENV}`,
  `${paths.appDotenv}.${NODE_ENV}.local`,
  `${paths.appDotenv}.local`,
]

dotenvsFiles.forEach(dotenvFile => {
  if (fs.existsSync(dotenvFile)) {
    // 支持使用${}引用已定义的变量
    require('dotenv-expand')(
      dotenv.config({
        path: dotenvFile,
      }),
    )
  }
})

const ENV_FILTER = /^JM_/i
const BUILIN_ENVS = [
  // common
  'VERSION',
  'SOURCE_MAP',
  'NAME',
  'PUBLIC_URL',
  'PAGE_EXT',
  'UNSAFE_DISABLE_TSLINT',
  // development
  'PORT',
  'HTTPS',
  'EVAL', // devtool eval
]

export default function getClientEnvironment(publicUrl?: string): WebpackEnviroment {
  const pkg = require(paths.appPackageJson)
  const raw = Object.keys(process.env)
    .filter(key => ENV_FILTER.test(key) || BUILIN_ENVS.indexOf(key) !== -1)
    .reduce<StringObject>(
      (env, key) => {
        env[key] = process.env[key] as string
        return env
      },
      {
        VERSION: pkg.version,
        NAME: pkg.name,
        PUBLIC_URL: NODE_ENV === 'production' ? publicUrl || process.env.PUBLIC_URL || './' : '/',
        PAGE_EXT: '.html',
        // NODE_ENV 可能会被篡改，所以固定住
        NODE_ENV,
      },
    )

  // for DefinePlugin
  const stringified = {
    'process.env': Object.keys(raw).reduce<StringObject>((env, key) => {
      env[key] = JSON.stringify(raw[key])
      return env
    }, {}),
  }

  const userDefine = Object.keys(raw)
    .filter(key => ENV_FILTER.test(key))
    .reduce<StringObject>((prev, cur) => {
      prev[cur] = raw[cur]
      return prev
    }, {})

  return {
    userDefine,
    raw,
    stringified,
  }
}
