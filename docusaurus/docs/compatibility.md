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

> Note: 因为preset-env依赖于browserslist指定的环境, 如果其中一个依赖需要特殊的 polyfill，默认情况下 Babel 无法将其检测出来. 这时需要显式导入`core-js` polyfills.