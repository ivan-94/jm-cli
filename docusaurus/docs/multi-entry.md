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

webpack 在生产环境构建时会对模块进行拆包和合并. `jm-cli`指定了两个规则:

- `vendor` 包含 node_modules 中的共享包
- `commons` 包含 src 中的共享包

在多页应用中这个规则是全局的, 只要被共享的块的引用次数达到阈值, 就会被抽取到上述的文件的. 这也导致了一个问题:

假设你有两个入口`admin`和`app`, `admin`中依赖的一些包如`antd`, 会被打包进`admin`和`app`公用的 vendor 文件中.
而`app`本身并不需要这份代码.

为了解决这个问题, `jm-cli`支持对页面进行分组. 使用**--group**选项来指定分组, 每个分组会被独立的编译, 避免共享不必要的库:

```shell
jm build --group.admin=admin,another-admin --group.app=index,another-app
# or
jm build --group=admin,another-admin --group=index,another-app
```

可以使用**--group.{GROUP_NAME}**来指定分组名. 分组名的意义是为了避免文件覆盖, 因为所有文件都是输出到同一个目录的.
使用**--group=a,b**形式, 会使用'\_'组合页面名称来作为分组名, 如 a_b
