---
id: multi-entry
title: Multiple Entry
sidebar_label: Multiple Entry
---

`jm-cli`会扫描`src`目录下的模板文件(默认是.html)来确定页面入口. `start`, `build`以及`analyze`命令都支持
**--entry**, `build`和`analyze`还支持**--group**命令.

## 使用**--entry**显式指定入口页面

**--entry**选项用于显式指定入口页面, 多个页面使用','分隔, 例如:

```shell
jm start --entry=a,b
```

## 使用**--group**对应用进行分组

### 默认的拆包和合并行为

webpack 在生产环境构建时会对模块进行拆包和合并. 一般情况下推荐调用`jm build`直接编译, `splitChunks`的默认配置已经可以使用大部分场景.

默认情况下多个页面'直接依赖(initial import)'的 node_modules 下的模块, 会抽取到`vendor` chunk. 在多个页面之间共享. 例如:

```html
<!-- admin.html -->
<script src="static/js/runtime.js?xxx"></script>
<script src="static/js/vendor~admin~index.js?xxx"></script>
<script src="static/js/admin.js?xxx"></script>

<!-- index.html -->
<script src="static/js/runtime.js?xxx"></script>
<script src="static/js/vendor~admin~index.js?xxx"></script>
<script src="static/js/index.js?xxx"></script>
```

可以看到`runtime.js`和`vendor~admin~index.js`是在两个页面之间共享的. 这样可以利用浏览器缓存, 减少资源加载次数.
而每个页面特定的依赖会放在各自的`{name}.js`文件中.

对于'按需依赖(async import)'则按照`SplitChunks`的默认行为进行拆包合并. [详见文档](https://webpack.docschina.org/plugins/split-chunks-plugin/)

对于 SplitChunks 的工作原理可以看这两篇文章:

- [webpack 4: Code Splitting, chunk graph and the splitChunks optimization](https://medium.com/webpack/webpack-4-code-splitting-chunk-graph-and-the-splitchunks-optimization-be739a861366)
- [Webpack 4 — Mysterious SplitChunks Plugin](https://medium.com/dailyjs/webpack-4-splitchunks-plugin-d9fbbe091fd0)

### **--group**的应用场景

如果你的多个页面是相互隔离的, 比如依赖于不同的版本, 或者想独立的编译但又不想重新编译其他页面, 或者不想在页面之间拆包和共享 chunk.
这时候应用分组就可以派上用场了

`jm-cli`支持对页面进行分组. 使用**--group**选项来指定分组, 每个分组会被独立的编译:

```shell
jm build --group.admin=admin,another-admin --group.app=index,another-app
# or
jm build --group=admin,another-admin --group=index,another-app
```

可以使用**--group.{GROUP_NAME}**来指定分组名. 分组名的意义是为了避免文件覆盖, 因为所有文件都是输出到同一个目录的.
使用**--group=a,b**形式, 会使用'\_'组合页面名称来作为分组名, 如 a_b
