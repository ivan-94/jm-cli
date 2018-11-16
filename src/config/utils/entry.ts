/**
 * 多页入口相关方法
 */
import glob from 'glob'
import path from 'path'
import fs from 'fs-extra'
import diff from 'lodash/difference'
import chalk from 'chalk'

const HtmlWebpackPlugin = require('html-webpack-plugin')

/**
 * scan entries in src
 */
export function getEntries(context: string, pageExt: string, entry?: string[]) {
  const entries: { [name: string]: string } = {}

  let pages = scanPages(context, pageExt).map(p => path.basename(p, pageExt))
  if (entry && entry.length) {
    pages = pages.filter(p => entry.indexOf(p) !== -1)

    if (pages.length !== entry.length) {
      const notfoundedPages = diff(entry, pages).map(i => `${i}${pageExt}`)
      console.error(`${chalk.blue(notfoundedPages.join(', '))} not found in ${chalk.cyan(context)}`)
      process.exit(1)
    }
  }

  pages.forEach(page => {
    let entryFileExt = '.tsx'

    if (fs.existsSync(path.join(context, `${page}.tsx`))) {
      entryFileExt = '.tsx'
    } else if (fs.existsSync(path.join(context, `${page}.ts`))) {
      entryFileExt = '.ts'
    } else {
      console.error(
        `${chalk.green(
          `${page}${pageExt}`,
        )} founded, but not any entry file(${page}.tsx or ${page}.ts) found in ${context}.`,
      )
      process.exit(1)
    }

    // 检查入口文件是否存在
    const entry = `./${page}${entryFileExt}`
    entries[page] = entry
  })

  return entries
}

/**
 * scan enty pages
 */
function scanPages(context: string, ext: string) {
  return glob.sync(path.join(context, `*${ext}`), {})
}

/**
 * generates HtmlWebpackPlugin for multiple entry
 */
export function genTemplatePlugin(
  context: string,
  pageEntries: { [key: string]: string },
  isProduction: boolean,
  templateParameters: { [key: string]: string },
  ext: string = '.html',
) {
  const pages = Object.keys(pageEntries)
  return pages.map(page => {
    const pagePath = path.join(context, `${page}${ext}`)

    return new HtmlWebpackPlugin({
      templateParameters,
      filename: page + '.html',
      inject: true,
      /**
       * html-wepback-plugin 已经支持父parent的识别
       */
      chunks: [page],
      template: pagePath,
      minify: isProduction
        ? {
            removeComments: true,
            collapseWhitespace: true,
            removeRedundantAttributes: true,
            useShortDoctype: true,
            removeEmptyAttributes: true,
            removeStyleLinkTypeAttributes: true,
            keepClosingSlash: true,
            minifyJS: true,
            minifyCSS: true,
            minifyURLs: true,
          }
        : undefined,
    })
  })
}
