/**
 * action wrapper
 */
import { Arguments } from 'yargs'
import chalk from 'chalk'
import { Handler, MiddlewareHandler } from './type'

export default (handler: Handler) => async (argv: Arguments) => {
  const middlewares: MiddlewareHandler[] = [require('./upgrade').default]
  for (let middleware of middlewares) {
    try {
      await middleware(argv)
    } catch (error) {
      // continue
      console.log(chalk.yellow(`Middleware invoke failed:`))
      console.log(error)
    }
  }
  handler(argv)
}
