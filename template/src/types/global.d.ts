// svg sprite
declare module '*.svg' {
  const value: {
    viewBox: string
    id: string
    content: string
  }

  export = value
}
