import { interpolate } from './utils'

// 由于proxy是在pacakge.json 上定义的，所以无法使用完全的属性， 例如方法
export type ProxyContext = string | string[]
export type ProxyMap = { [context: string]: string | { target: string } }
export type ProxyOriginConfig = { context: ProxyContext; target: string }
export type ProxyConfig = string | ProxyMap | ProxyOriginConfig | Array<string | ProxyOriginConfig>

/**
 * shorthand like proxy: 'http://www.example.org:8000/api'); => proxy('/api', {target: 'http://www.example.org:8000'});
 * object like proxy: {"/context": {target: 'http://www.example.com'}} or {"/context": {target: 'http://www.example.com'}
 * array like: [{context: string, target: string}]
 * @param proxy
 */
export function interpolateProxy(proxy: ProxyConfig, local: { [key: string]: string }): ProxyConfig {
  if (typeof proxy === 'string') {
    return interpolate(proxy, local)
  } else if (Array.isArray(proxy)) {
    return proxy.map(i => interpolateProxy(i, local)) as ProxyConfig
  } else if (typeof proxy === 'object' && 'context' in proxy) {
    proxy = proxy as ProxyOriginConfig
    const context = proxy.context
    return {
      ...proxy,
      context: Array.isArray(context)
        ? context.map(i => interpolate(i, local))
        : typeof context === 'string'
        ? interpolate(context, local)
        : context,
      target: interpolate(proxy.target as string, local),
    }
  } else if (typeof proxy === 'object') {
    const res: ProxyConfig = {}
    Object.keys(proxy).forEach(context => {
      const value = (proxy as ProxyMap)[context]
      res[interpolate(context, local)] =
        typeof value === 'string'
          ? interpolate(value, local)
          : {
              ...value,
              target: interpolate(value.target, local),
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
  if (typeof proxy === 'string') {
    return proxy
  } else if (Array.isArray(proxy)) {
    return proxy.map(i => proxyInfomation(i)).join('\n')
  } else if (typeof proxy === 'object' && 'context' in proxy) {
    proxy = proxy as ProxyOriginConfig
    const context = proxy.context
    const contextStr = Array.isArray(context) ? context.join(', ') : context
    return `${contextStr} ~> ${proxy.target}`
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
