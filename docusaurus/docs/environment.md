---
id: environments
title: Environments
sidebar_label: Environments
---

`jm-cli`通过`dot-env`来识别项目根目录下的.env\*文件.

## 加载优先级

- `环境变量`. 如`cross-env HTTPS=true jm start`
- `.env.{NODE_ENV}.local` 本地.env 文件, `.local` 文件不会被提交到版本库. 旨在覆盖.env\*中的默认配置
- `.env.{NODE_ENV}`
- `.env`

## 变量展开

`.env`文件支持变量展开, 这样可以避免重复定义:

```shell
# 这是注释
JM_APP_NAME=my-app
JM_API_ROOT=${JM_APP_NAME}/api
JM_STATIC_ROOT=${JM_APP_NAME}/static
```

变量不一定是当前文件定义的, 它可以是任何已存在的环境变量:

```shell
JM_APP_ENV=${NODE_ENV}/api
```

除此之外. `package.json`中的`proxy`配置也支持环境变量名展开, 这样可以避免重复修改 package.json:

```json
{
  "jm": {
    "proxy": {
      "${JM_API_ROOT}": {
        "target": "${JM_DEV_SERVER}",
        "changeOrigin": true,
        "secure": false
      }
    }
  }
}
```

> Note: proxy 配置项只支持`context`和`target`的变量展开

## 内置可配置项

| Variable              | Development / Production / Configurable | Description                                                                                 |
| --------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------- |
| VERSION               | ✅ / ✅ / 🚫                            | 版本号, 从 package.json 中获取                                                              |
| NAME                  | ✅ / ✅ / 🚫                            | 应用名称, 从 package.json 中获取                                                            |
| NODE_ENV              | ✅ / ✅ / 🚫                            | 当前环境. start 执行下为 development; build 和 serve 下为 production; test 下为 test        |
| PUBLIC_URL            | 🚫 / ✅ / ✅                            | 影响 webpack 的 public_path. 默认为`./`, 即相对路径. 如果需要在特殊环境部署, 可以设置该选项 |
| SOURCE_MAP            | ✅ / ✅ / ✅                            | 是否生成 source_map, 默认为 true                                                            |
| EVAL                  | ✅ / 🚫 / ✅                            | 是否使用 eval_source_map, 默认为 false, 如果需要在开发环境调试编译后的代码, 可以开启该选项  |
| PAGE_EXT              | ✅ / ✅ / ✅                            | 模板文件扩展名, 默认为`.html`                                                               |
| UNSAFE_DISABLE_TSLINT | ✅ / ✅ / ✅                            | 禁用 Tslint. 不推荐! 请遵循团队规范, 特殊情况下使用                                         |
| PORT                  | ✅ / 🚫 / ✅                            | 设置默认端口号. 如果端口被占用, 会自动选取其他端口                                          |
| HTTPS                 | ✅ / 🚫 / ✅                            | 是否开启 HTTPS. jm-cli 会自动生成自签名证书                                                 |

## 自定义配置项

除了上述的内置配置项, 只有`JM_`为前缀的自定义环境变量会被保留.

## 在模板文件中访问环境变量

模板文件, 如 pug, 可以直接访问内置变量和用户自定义变量. 例如

```pug
meta(name="name" content=NAME)
meta(name="version" content=VERSION)
```

如果使用纯 html, 可以这样访问环境变量, 使用和.env 文件变量替换一样的语法:

```html
<meta name="name" content="${NAME}" /> <meta name="version" content=${VERSION}" />
```

## 在 Ts 代码中访问环境变量

一共有两种方式:

### process.env.\*

这是`NodeJS`风格的环境变量访问方式. webpack 中也支持, 只不过它会在编译阶段内联到源码中.

它的好处是可以实现代码优化, 比如根本无法执行到的条件分支会被移除, 例如:

```typescript
if (process.env.NODE_ENV === 'development') {
  console.log(data)
}
```

在生产环境构建时会被内联成:

```typescript
if ('production' === 'development') {
  console.log(data)
}
```

这个代码分支是无法到达的, 所以代码优化器(如 urglifyJS)会移除掉这些`Dead Code`. 缺点也比较明显, 你
无法在运行时干预它, 对他们进行重新配置.他们在编译时就已经固化, 要改变他们只能重新编译. 所以`jm-cli`
提供了另一种的访问方式.

### window.JM_ENV.\*

`window.JM_ENV`对象在编译时注入到了入口 html 文件. 你可以通过这个对象来访问你的**自定义环境变量**. 例如:

```typescript
export default new RpcClient(window.JM_ENV.JM_RPC_ROOT || '/root')
```

所有希望在运行时可配的环境变量都应该使用这种方式.
