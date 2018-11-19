---
id: features
title: Features
sidebar_label: Features
---

## Typescript

Typescript 是`jm-cli`强制使用的语言, 它可以让项目更容易维护和理解, 让开发者少犯错误.
配合`vsocde`的智能提醒可以获得较高的开发效率. Typescript 的更多介绍可以[查看官网](https://www.typescriptlang.org).

`jm-cli`最新版本会保持和 Typescript 同步更新, 让开发者可以使用的最新的语言特性.

> Note: 由于`jm-cli`使用`Babel7`来转译 Typescript 文件, 以下特性不能正常使用:
>
> - 不支持`namespace`
> - 不支持`const enum` 因为它在编译时依赖类型信息. 但是 babel 不会对 Typescript 进行`语义检查`. 它的原理只是移除掉类型注释
> - 不支持`export =` 和 `import =`. 我们也不鼓励使用这些不标准的模块使用方式
>
> 详见[@babel/plugin-transform-typescript](https://babeljs.io/docs/en/babel-plugin-transform-typescript)

### 为什么使用 babel 编译 Typescript?

相比 Typescript, babel 有丰富的插件生态, 例如`babel-import-plugin`, `react-hot-loader`. 可以帮助我们解决很多构建问题.

而在某些程度上, 这也是 babel 的缺点, Typescript 有统一的语言特性, 不需要插件就可以直接编译, 开发者不需要关心需要选择什么插件和如何配置. 对于简单的项目
还是推荐直接使用 Typescript.

还有一个原因就是构建速度. babel 的 Typescript 插件原理是删除掉 Typescript 的类型注解, 不会去关心源码的语义, 这个过程是比较高效的.
而 Typescript 的类型检查则交由`fork-ts-checker-webpack-plugin`处理, 它运行在一个独立的进程上. 可以提交构建的速度

## Tslint

`jm-cli`默认使用`Tslint`在编码上的交叉, 作为`Typescript`的延伸约束. 这部分约束是 Typescript 没有覆盖的, 比如变量命名, 成员的定义顺序,
模块分组等等. 默认的 Tslint 规则见[编码规范](tslint.md)

## Prettier

`jm-cli`创建的项目默认会添加`prettier` + `husky`. 在 commit 时对代码进行格式化.

## react-hot-loader

如果项目添加了`react-hot-loader`依赖, `jm-cli`将自动启用 React 模块热替换支持. 例如:

```typescript
import React from 'react'
import { hot } from 'react-hot-loader'
import { log } from '~/utils'

export class App extends React.Component<{}, {}> {
  public componentDidMount() {
    log('mounted')
  }
  public render() {
    return <div>App</div>
  }
}

export default hot(module)(App)
```

## svg React Component

`jm-cli`使用`svgr`方案替换了旧的`svg-sprite-loader`. `svgr`可以支持获取 url 或者转换为 React 组件的方式来获取 svg 图标/图片.

```typescript
import logo from './logo.svg' // 图片形式
import { ReactComponent as Star } from './star.svg' // React组件形式

// ...
<img src={logo}/>
<Star style={{fill: 'red'}}>
```

## 其他特性

### update notifier

`jm-cli`会周期性检查更新. `jm-cli`本身遵循`semver`语义化版本规范, 当存在向下兼容的版本时会通知开发者升级版本.

需要注意的是, 全局安装的命令和作为项目依赖的命令的更新策略是不一样的. 全局安装的命令默认会检查最新版本, 而本地依赖的命令会检查 minor 兼容的版本,
自动忽略到 major 版本更新.

可以调用`jm upgrade`手动检查更新.

### proxy

API 代理, 详见配置

### babel-import-plugin

用于支持`antd`, `antd-mobile`或`rxjs`等库的按需加载

### babel-macros-plugin

零配置使用 babel 插件, 详见[babel-macros-plugin](babel-macro.md)
