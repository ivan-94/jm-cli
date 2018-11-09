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
