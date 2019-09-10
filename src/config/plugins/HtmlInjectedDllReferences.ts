/**
 * inject dll script tag
 */
import { Compiler } from 'webpack'

const NAME = 'HtmlInjectedEnvrioments'

export default class HtmlInjectedDllReferences {
  public constructor(private name: string) {}
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
              attributes: { 'data-dll': true, src: `./${this.name}.js` },
            })
            cb(null, data)
          },
        )
    })
  }
}
