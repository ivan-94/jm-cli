/**
 * interpolate enviroments in html
 */
import { Compiler } from 'webpack'
import { interpolate } from '../../utils'

const NAME = 'HtmlInterpolate'

export default class HtmlInterpolate {
  public constructor(private env: { [key: string]: string }) {}
  public apply(compiler: Compiler) {
    compiler.hooks.compilation.tap(NAME, compilation => {
      require('html-webpack-plugin')
        .getHooks(compilation)
        .beforeEmit.tapAsync(NAME, (data: { html: string }, cb: (error: Error | null, data: any) => void) => {
          // interpolate enviroments
          data.html = interpolate(data.html, this.env)
          cb(null, data)
        })
    })
  }
}
