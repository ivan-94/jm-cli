export interface CommonOption {
  inspect?: boolean
}

export type ProxyContext = string | string[] | (() => boolean)
export type ProxyMap = { [context: string]: string | { target: string } }
export type ProxyOriginConfig = { context: ProxyContext; target: string }
export type ProxyConfig = string | ProxyMap | ProxyOriginConfig | Array<string | ProxyOriginConfig>
