import { Configuration } from 'webpack'
import { WebpackEnviroment } from '../env'
import { WebpackPaths } from '../paths'

export type WebpackConfigurer = (
  env: WebpackEnviroment,
  pkg: { [key: string]: any },
  paths: WebpackPaths,
  argv: {
    name?: string
    entry?: string[]
  },
) => Configuration

export interface ImportPlugin {
  libraryName: string
}
