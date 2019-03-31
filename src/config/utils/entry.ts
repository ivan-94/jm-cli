/**
 * 多页入口相关方法
 */
import glob from 'glob'
import path from 'path'
import fs from 'fs-extra'
import chalk from 'chalk'
import uniq from 'lodash/uniq'
import diff from 'lodash/difference'

import { message } from '../../utils'
import { Extensions, TemplateExtensions } from '../../constants'
import paths from '../../paths'

const HtmlWebpackPlugin = require('html-webpack-plugin')
const PageLessFileRegexp = /.*\/(.*)\.page\..*$/

export interface PageOption {
  context: string
  entry?: string[]
  isProduction?: boolean
  electron?: boolean
  templateParameters: { [key: string]: string }
}

/**
 * scan entries in src
 */
export function getEntries(option: PageOption) {
  const { context } = option
  const entries: { [name: string]: string[] } = {}
  const templatePlugins: any[] = []
  const templates = getTraditionalEntries(option)
  const traditionalEntries = Object.keys(templates)
  const pageLessEntries = getPagelessEntries(option)
  const electronEntries = getElectronEntries(option)
  const defaultHtmlTempalte = getDefaultTemplate()

  // 检验是否找到指定的入口文件
  checkEntryExisting(traditionalEntries.concat(electronEntries), option)

  // 剔除.page文件
  diff(traditionalEntries, pageLessEntries).forEach(page => {
    entries[page] = [`./${page}`]

    // 生成html-webpack-plugin
    const tplPath = path.join(context, `${page}.${templates[page]}`)
    templatePlugins.push(
      new HtmlWebpackPlugin({
        ...getCommonTemplatePluginOptions(page, option),
        template: tplPath,
      }),
    )
  })

  pageLessEntries.forEach(page => {
    entries[page] = [`./${page}.page`]
    const tplPath =
      traditionalEntries.indexOf(page) !== -1 ? path.join(context, `${page}.${templates[page]}`) : defaultHtmlTempalte
    templatePlugins.push(
      new HtmlWebpackPlugin({
        ...getCommonTemplatePluginOptions(page, option),
        template: tplPath,
      }),
    )
  })

  electronEntries.forEach(page => {
    if (page in entries) {
      // 已经有tradition 入口定义
      return
    }

    entries[page] = [`./${page}`]
    templatePlugins.push(
      new HtmlWebpackPlugin({
        ...getCommonTemplatePluginOptions(page, option),
        template: defaultHtmlTempalte,
      }),
    )
  })

  // 警告并使用默认入口
  if (Object.keys(entries).length === 0) {
    const defaultIndex = path.join(context, 'index')
    const ext = findJsFiles(defaultIndex, false)
    if (ext) {
      message.warn(`Use 'index${ext}' as default entry`)
      const page = 'index'
      entries[page] = [`./${page}`]
      templatePlugins.push(
        new HtmlWebpackPlugin({
          ...getCommonTemplatePluginOptions(page, option),
          template: defaultHtmlTempalte,
        }),
      )
    } else {
      message.error(`Not entries found in ${context}.`)
      process.exit(1)
    }
  }

  // 添加开发环境依赖
  if (!option.isProduction) {
    for (const entry in entries) {
      entries[entry].unshift(require.resolve('webpack/hot/dev-server'))
      entries[entry].unshift(require.resolve('webpack-dev-server/client') + '?/')
    }
  }

  return {
    entries,
    templatePlugins,
  }
}

/**
 * 传统的入口方式, 一个page.{ext} 对应 一个page.js
 */
function getTraditionalEntries({ context, entry }: PageOption) {
  const globStr = path.join(context, `*.@(${TemplateExtensions.map(i => i.slice(1)).join('|')})`)
  const reg = /^.*\/(.*)\.([a-zA-Z]*)$/
  const matchPages = glob.sync(globStr, {})
  const pages = matchPages.reduce<{ [page: string]: string }>((entries, page) => {
    const matched = page.match(reg)
    if (matched) {
      const [, name, ext] = matched
      if (entry == null || entry.indexOf(name) !== -1) {
        entries[name] = ext
      }
    }
    return entries
  }, {})

  return pages
}

/**
 * 从page.json 中获取入口文件信息
 */
function getElectronEntries({ electron, context, entry }: PageOption): string[] {
  if (!electron) {
    return []
  }

  const configPath = path.join(context, 'page.json')
  if (!fs.existsSync(configPath)) {
    return []
  }

  const config = fs.readJsonSync(configPath) as { [page: string]: any }
  return Object.keys(config).filter(p => (entry ? entry.indexOf(p) !== -1 : true))
}

/**
 * 获取*.page.ext 形式的入口
 * @param param0
 */
function getPagelessEntries({ context, entry }: PageOption) {
  return glob
    .sync(path.join(context, `*.page.@(${Extensions.map(i => i.slice(1)).join('|')})`))
    .map(p => {
      const match = p.match(PageLessFileRegexp)
      return match![1]
    })
    .filter(p => (entry ? entry.indexOf(p) !== -1 : true))
}

/**
 * 检查对应的Javascript入口是否存在
 * @param page
 */
function findJsFiles(page: string, checkPageless: boolean = true) {
  const exts = Extensions.concat(checkPageless ? Extensions.map(i => `.page${i}`) : [])
  for (const ext of exts) {
    if (fs.existsSync(page + ext)) {
      return ext
    }
  }

  return undefined
}

/**
 * 检查是否存在入口
 * @param entries
 * @param param1
 */
function checkEntryExisting(entries: string[], { context }: PageOption) {
  uniq(entries).forEach(page => {
    const pagePath = path.join(context, page)
    const entryFileExt = findJsFiles(pagePath)
    if (entryFileExt == null) {
      message.error(
        `not any entry file(${chalk.blue(`${page}.{tsx|ts|js|jsx}`)} or ${chalk.blue(
          `${page}.page.{tsx|ts|js|jsx}`,
        )}) found in ${context}.`,
      )
      process.exit(1)
    }
  })
}

/**
 * 获取默认的html-webpack-plugin 模板
 */
function getDefaultTemplate() {
  if (fs.existsSync(paths.appHtml)) {
    return paths.appHtml
  }

  return paths.ownHtml
}

/**
 * 获取通用的html-webpack-plugin配置项
 * @param page 入口名称
 * @param param0
 */
function getCommonTemplatePluginOptions(page: string, { isProduction, templateParameters }: PageOption) {
  return {
    title: page,
    filename: `${page}.html`,
    chunks: [page],
    templateParameters,
    inject: true,
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
  }
}
