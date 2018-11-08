/// <reference types="webpack" />

declare module 'validate-npm-package-name' {
  const value: (name: string) => { validForNewPackages: boolean; errors?: string[]; warnings: string[] }
  export = value
}

declare module 'webpack-format-messages' {
  const value: (stat: webpack.Stats) => { errors: string[]; warnings: string[] }
  export default value
}
