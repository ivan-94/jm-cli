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
    start: (stat: any) => void
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
