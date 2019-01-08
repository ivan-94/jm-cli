import { Configuration } from 'webpack'
import { WebpackEnviroment } from '../env'
import { WebpackPaths } from '../paths'
import { JMOptions, ImportPluginConfig } from '../options'

export type WebpackConfigurer = (
  env: WebpackEnviroment,
  pkg: { [key: string]: any },
  paths: WebpackPaths,
  argv: {
    name?: string
    entry?: string[]
    jmOptions: JMOptions
  },
) => Configuration

export { ImportPluginConfig, JMOptions }
