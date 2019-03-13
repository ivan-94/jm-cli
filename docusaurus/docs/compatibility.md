---
id: compatibility
title: Browser Compatibility
sidebar_label: Browser Compatibility
---

## browserslist

可以通过package.json中的browserslist字段来设置目标浏览器范围. 这个值会被 **@babel/preset-env** 和 **postcss-preset-env**
识别. 用来确定需要转译的JS/CSS特性. 例如

```json
{
  "browserslist": ["Firefox >= 37", "chrome > 28"],
  "jm": {
    "useBuiltIns": "usage",
  }
}
```

> 可以通过`jm.useBuiltIns`来配置@babel/preset-env

更多配置方式[详见browserslist](https://github.com/browserslist/browserslist#queries)

## Polyfills

jm-cli 默认将`@babel/preset-env`配置为[**useBuiltIns: 'usage'**](https://babeljs.io/docs/en/babel-preset-env#usebuiltins). 它会根据源代码中出现的语言特性自动检测需要的 polyfill。这确保了最终包里 polyfill 数量的最小化.

> Note: 因为preset-env依赖于browserslist指定的环境, 如果其中一个依赖, 如第三方库, 这些代码没有经过babel转译, 所以这些源代码中依赖的特殊的 polyfill，默认情况下 Babel 无法将其检测出来. 这时需要显式导入`core-js` polyfills.

## Polyfill.io

除了上述的方式, 还可以使用[`polyfill.io`](https://polyfill.io/v2/docs/)的服务. 它可以根据当前浏览器的UA生成需要的Polyfill, 使用方法也很简单, 在模板中引入即可:

```html
<script src="https://cdn.polyfill.io/v2/polyfill.min.js"></script>
```

> Note: polyfill.io只会默认集成一些最为常用的语言特性, 所以一些特性可能需要手动添加:
> ```
>  https://cdn.polyfill.io/v2/polyfill.min.js?features=Array.prototype.includes,WeakMap,default
> ```
> 详见 [Feature list](https://polyfill.io/v2/docs/features/#feature-list)
>

## 使用`jm polyfill`命令生成polyfill文件

Polyfill.io是一个第三方服务，而且位于国外，这可能会对我们的应用造成一些影响。在`v0.2`后，新增了一个`polyfill`
命令，根据`package.json`指定的`browserslist`和`polyfill`来生成polyfill文件.

```shell
jm polyfill -o public/polyfill.js
```

+ browserslist: 用于指定浏览器的最低兼容版本. 通过[`core-js-compat`](https://github.com/zloirock/core-js/tree/master/packages/core-js-compat)来计算可以兼容的特性
+ polyfill: 这是一个字符串数组，指定需要添加的polyfill. 默认会添加一下polyfills:
  ```
  'es.promise',
  'es.array.from',
  'es.array.of',
  'es.array.fill',
  'es.array.index-of',
  'es.array.find-index',
  'es.array.find',
  'es.object.assign',
  'es.object.keys',
  'es.string.ends-with',
  'es.string.starts-with',
  'es.string.includes',
  'es.symbol.iterator',
  'es.symbol.species',
  'es.map',
  'es.set',
  ```

> 为了避免冲突，可以将`jm.useBuiltIns`设置为false

## 哪些东西不能被polyfill?

polyfill底层都是使用core-js, core-js在[官方文档](https://github.com/zloirock/core-js#missing-polyfills)中已经罗列下面一些特性是无法被polyfill的:
- ES `JSON` is missing now only in IE7- and never will it be added to `core-js`, if you need it in these old browsers, many implementations are available.
- ES `String#normalize` is not a very useful feature, but this polyfill will be very large. If you need it, you can use [unorm](https://github.com/walling/unorm/).
- ES `Proxy` can't be polyfilled, but for Node.js / Chromium with additional flags you can try [harmony-reflect](https://github.com/tvcutsem/harmony-reflect) for adapt old style `Proxy` API to final ES2015 version.
- `window.fetch` is not a cross-platform feature, in some environments it makes no sense. For this reason, I don't think it should be in `core-js`. Looking at a large number of requests it *may be*  added in the future. Now you can use, for example, [this polyfill](https://github.com/github/fetch).
- ECMA-402 `Intl` is missed because of size. You can use [this polyfill](https://github.com/andyearnshaw/Intl.js/).


## mobx 回退

mobx5 依赖于Proxy特性, 导致无法在低版本的浏览器中被使用, 如果你需要适配这些浏览器, 则需要将mobx降级到4.x:

```shell
# 安装最新版本4.x版本, mobx官方会同时维护5.*和4.*两个版本
yarn add mobx@4.*

# 安装最新版本的mobx-react, 可以同时用于5.x和4.x的mobx版本
yarn add mobx-react
```