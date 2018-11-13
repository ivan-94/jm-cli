/**
 * inject enviroments to head script
 */
import { Compiler } from 'webpack'

const NAME = 'HtmlInjectedEnvrioments'

export default class HtmlInjectedEnvrioments {
  public constructor(private env: { [key: string]: string }, private namespace: string) {}
  public apply(compiler: Compiler) {
    compiler.hooks.compilation.tap(NAME, compilation => {
      require('html-webpack-plugin')
        .getHooks(compilation)
        .alterAssetTagGroups.tapAsync(
          NAME,
          (
            data: {
              headTags: Array<{ tagName: string; attributes: { [key: string]: any }; innerHTML?: string }>
            },
            cb: (error: Error | null, data: any) => void,
          ) => {
            // inject enviroments
            data.headTags.push({
              tagName: 'script',
              attributes: {},
              innerHTML: `window.${this.namespace} = ${JSON.stringify(this.env, null, 2)}`,
            })
            cb(null, data)
          },
        )
    })
  }
}
