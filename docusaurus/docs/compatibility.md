---
id: compatibility
title: Browser Compatibility
sidebar_label: Browser Compatibility
---

## browserslist

可以通过package.json中的browserslist字段来设置目标浏览器范围. 这个值会被**@babel/preset-env**和**postcss-preset-env**
识别. 用来确定需要转译的JS/CSS特性. 例如

```json
{
  "browserslist": ["Firefox >= 37", "chrome > 28"]
}
```

更多配置方式[详见browserslist](https://github.com/browserslist/browserslist#queries)

## Polyfills

jm-cli 默认将`@babel/preset-env`配置为[**useBuiltIns: 'usage'**](https://babeljs.io/docs/en/babel-preset-env#usebuiltins). 它会根据源代码中出现的语言特性自动检测需要的 polyfill。这确保了最终包里 polyfill 数量的最小化.

> Note: 因为preset-env依赖于browserslist指定的环境, 如果其中一个依赖, 如第三方库, 这些代码没有经过babel转译, 所以这些源代码中依赖的特殊的 polyfill，默认情况下 Babel 无法将其检测出来. 这时需要显式导入`core-js` polyfills.

## Polyfill.io

除了上述的方式, 还可以使用`polyfill.io`的服务. 它可以根据当前浏览器的UA生成需要的Polyfill, 使用方法也很简单, 在模板中引入即可:

```html
<script src="https://cdn.polyfill.io/v2/polyfill.min.js"></script>
```