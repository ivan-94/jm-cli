/// <reference types="webpack" />

declare module 'validate-npm-package-name' {
  const value: (name: string) => { validForNewPackages: boolean; errors?: string[]; warnings: string[] }
  export = value
}

declare module 'webpack-format-messages' {
  const value: (stat: webpack.Stats) => { errors: string[]; warnings: string[] }
  export default value
}

type StringArrayObject = { [key: string]: string[] }
type StringObject = { [key: string]: string }

declare module 'webpack-bundle-analyzer' {
  const value: {
    start: (stat: any, options: { port?: number; host?: string }) => void
  }
  export default value
}

declare module 'address' {
  const value: {
    ip: (interfaceName?: string) => string
  }
  export default value
}

declare module 'dumper.js' {
  export function dump(value: any): void
}

declare module 'webpack-dev-server/lib/utils/createCertificate' {
  export default function(attr: Array<{ name: string; value: string }>): { private: string; cert: string }
}

declare module 'ajv' {
  export interface AjvError {
    keyword: string
    dataPath: string
    schemaPath: string
    params: any
    message: string
  }
  export default class Ajv {
    constructor(options?: any)
    addMetaSchema(schemaDefinition: any): void
    compile(
      schema: any,
    ): {
      (data: any): boolean
      errors: AjvError[]
    }
  }
}

declare module 'boxen' {
  export default function(
    message: string,
    options?: {
      borderColor?: string
      borderStyle?: 'single' | 'double' | 'round'
      padding?: number
      margin?: number
      float?: 'right' | 'center' | 'left'
      align?: 'right' | 'center' | 'left'
    },
  ): string
}

declare module 'hash-sum' {
  export default function(data: any): string
}

declare module 'core-js-builder' {
  export default function(opt: {targets?: string | string[], modules: string[], filename?: string}): Promise<string>
}

declare module 'core-js-compat' {
  export default function(opt: {targets?: string | string[]}): {list: string[], targets: {[key: string]: {[browser: string]: string }}}
}

declare module 'terser' {
  export default {
    minify(code: string, options: any): {error?: Error, code?: string}
  }
}