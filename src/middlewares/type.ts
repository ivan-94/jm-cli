import { Arguments } from 'yargs'

export type Handler = (argv: Arguments) => void
export type MiddlewareHandler = (argv: Arguments) => Promise<void>
