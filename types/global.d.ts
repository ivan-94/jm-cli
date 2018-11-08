declare module 'validate-npm-package-name' {
  const value: (name: string) => { validForNewPackages: boolean; errors?: string[]; warnings: string[] }
  export = value
}
