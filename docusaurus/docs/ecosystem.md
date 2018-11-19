---
id: ecosystem
title: Ecosystem
sidebar_label: Ecosystem
---

现代 web 应用都需要涉及多种应用方案的组合. 不同的框架的都有类似的组合方式或解决方案. Vue 生态圈, 大多数解决方案都是官方
或者官方推荐的, 然而对于 React 社区来说这种组合方案实在太多, 下面的列举的是我们团队比较熟悉的, 且经过实践的解决方案:

- 前端路由: `react-router` v4
- 状态管理器: `mobx` mobx 并没有像`redux`统一的使用规范.
  - 不可变数据: `immer`
- 样式:
  - `css` 使用标准的 css, 配合 postcss 可以使用较为先进的特性. 使用BEM命名规范
  - `styled-components` CSS-in-JS 解决方法, 直接转换成 React 组件
- 静态资源:
  - 图标: svg 使用`svgr`转换成 react 组件使用
- 组件库: `antd`, `antd-mobile`. 我们还在这些基础组件库的基础上扩展了轻度耦合业务的组件库
- 工具库: `loadsh`
- 图表: `recharts`
- 代码分割: 使用React 16.6的lazy功能
