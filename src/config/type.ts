import { Configuration } from 'webpack'
import { WebpackEnviroment } from '../env'
import { WebpackPaths } from '../paths'

export type WebpackConfigurer = (
  env: WebpackEnviroment,
  pkg: object,
  paths: WebpackPaths,
  argv: {
    name?: string
    entry?: string[]
  },
) => Configuration
