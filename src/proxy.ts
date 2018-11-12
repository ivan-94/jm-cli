import { interpolate } from './utils'
import { Express } from 'express'
import proxyMiddleware, { Config } from 'http-proxy-middleware'

/**
 * 由于proxy是在pacakge.json 上定义的，所以无法使用完全的属性， 例如方法. 所以限制只能使用以下格式:
 * ①
 *   proxy: {
 *     '/api': { target, ...option },
 *     '/api2': target
 *   }
 * ②
 *   [
 *     {context: '/api', target: xxx, ...option}
 *     {context: ['/api1', '/api2], target: xxx, ...option}
 *   ]
 */
export type ProxyConfig = ProxyMap | ProxyArray
export type ProxyMap = { [context: string]: string | Config }
export type ProxyArray = Array<Config & { context: string | string[] }>

/**
 * 解析配置中的环境变量
 * @param proxy
 */
export function interpolateProxy(proxy: ProxyConfig, local: { [key: string]: string }): ProxyConfig {
  if (Array.isArray(proxy)) {
    return proxy.map(i => {
      return {
        ...i,
        context: Array.isArray(i.context) ? i.context.map(c => interpolate(c, local)) : interpolate(i.context, local),
        target: i.target && interpolate(i.target, local),
      }
    })
  } else if (typeof proxy === 'object') {
    const res: ProxyConfig = {}
    Object.keys(proxy).forEach(context => {
      const value = proxy[context]
      res[interpolate(context, local)] =
        typeof value === 'string'
          ? interpolate(value, local)
          : {
              ...value,
              target: interpolate(value.target!, local),
            }
    })
    return res
  }

  return proxy
}

/**
 * print proxy proxyInfomation
 */
export function proxyInfomation(proxy: ProxyConfig): string {
  if (Array.isArray(proxy)) {
    return proxy
      .map(i => {
        return `${Array.isArray(i.context) ? i.context.join(', ') : i.context} ~ ${i.target}`
      })
      .join('\n')
  } else if (typeof proxy === 'object') {
    return Object.keys(proxy)
      .map(context => {
        const value = (proxy as ProxyMap)[context]
        const targetStr = typeof value === 'object' ? value.target : value
        return `${context} ~> ${targetStr}`
      })
      .join('\n')
  }

  return ''
}

export function applyProxyToExpress(proxy: ProxyConfig, app: Express) {
  let proxyOptions: ProxyArray = []
  if (Array.isArray(proxy)) {
    proxyOptions = proxy
  } else {
    proxyOptions = Object.keys(proxy).map(context => {
      const value = proxy[context]
      if (typeof value === 'string') {
        return { context, target: value, logLevel: 'warn' as 'warn' }
      }

      return {
        context,
        logLevel: 'warn' as 'warn',
        ...value,
      }
    })
  }

  proxyOptions.forEach(proxyConfig => {
    const context = proxyConfig.context
    if (proxyConfig.target) {
      const middleware = proxyMiddleware(proxyConfig)
      app.use(context, middleware)
    }
  })
}
