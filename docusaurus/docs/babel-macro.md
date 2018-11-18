---
id: babel-macro
title: babel-plugin-macros
sidebar_label: babel-plugin-macros
---

和`create-react-app`一样, `jm-cli`并不提供底层 babel 的配置方式, 但是很多库都提供了 babel 插件.
例如`styled-components`. 用来在编译时处理一些事件, 将运行时要做的一些工作挪到编译时进行.

传统的 babel 需要将这些插件通过`.babelrc`的方式配置, 这让`create-react-app`变得难以适应需求, 这就是`babel-plugin-macros`
出现的原因.

`create-react-app` 2.0 正式引入了`babel-plugin-macros`, 提供了一种零配置使用插件的模式:

```typescript
import styled from 'styled-components/macro'

// A static className will be generated for Title (important for SSR)
const Title = styled.h1`
  font-size: 1.5em;
  text-align: center;
  color: palevioletred;
`
```

`babel-plugin-macros`会是未来第三方库 babel 插件的规范.

当然, 和普通的 babel 详见相比是有一定局限性的, 详见[kentcdodds/babel-plugin-macros](https://github.com/kentcdodds/babel-plugin-macros),
以及[awesome-babel-macros](https://github.com/jgierer12/awesome-babel-macros)
