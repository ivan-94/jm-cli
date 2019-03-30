---
id: template
title: Custom Template
sidebar_label: Custom Template
---

`jm-cli`的`create`命令支持自定义模板. `jm-cli`只要求模板是一个合法的 npm 包, 即根目录下必须有一个 package.json 文件.
下面介绍一些创建模板的技巧

## 创建初始模板

可以通过`jm create my-template`创建一个初始化项目, 在这个项目的基础上增加你自己的功能.

## 文件忽略

`jm-cli`底层使用`npm pack`命令来下载你的模板. 和你`npm publish`到 npm 仓库的原理一样, 一些文件会被 npm 忽略掉.
例如`node_modules`. npm 按照以下规则来选择打包的文件:

- 通过 package.json 的 files 字段指定被打包的文件(即白名单方式)
- 如果没有指定 files, 则通过.npmignore 忽略文件(即黑名单方式)
- 通过没有指定.npmignore, 会使用.gitignore 忽略文件

另外一些文件是始终会被忽略的, 如`node_modules`, `.gitignore`, `.npmignore`.

所以在发布你的模板是要注意这些打包规则, 也可以利用这些规则. 当以下文件不存在时, `create`命令会默认创建. 如果你想要始终
使用`jm-cli`的最新默认配置, 则应该将他们添加到忽略清单中:

- `.gitignore`
- `.vscode` jm-cli 会扩展一些设置, 如 package.json 智能提醒
- `tslint.json`
- `tsconfig.json`
- `global.d.ts`
- `prettier`

### 添加.gitignore

因为.gitignore 会被 npm 忽略掉, 如果是想要将.gitignore 带给最终用户, 需要创建一个`gitignore`拷贝文件. 如果没有找到
`gitignore`文件, `create`命令会自动添加一个默认的`.gitignore`文件

### 扩展 tslint 规则

建议在`create`默认创建的 tslint.json 上扩展规则.

### 添加.template-ignore 设置忽略拷贝的文件

有一些文件, 可能你想添加到版本库中, 但又想`create`命令忽略拷贝它. 这时候可以在根目录创建`.template-ignore`文件.

比如忽略掉.vscode, tslint.json 这些文件, 让`create`来创建他们

## 处理 package.json

以下字段在创建时会合并到新创建的项目中:

- dependencies
- devDependencies
- scripts
- jm
- browserslist
- jm\_ 为前缀的字段
- includeFields 中指定的字段

### 处理 jm-cli 版本

你可以在 package.json 中绑定具体的 jm-cli 版本. 如果你总是要安装 jm-cli 的最新版本, 可以将版本指定为'\*'

## 测试

```shell
jm create [name] --template file:./my-tempale --force

```

## 示例模板

- [jm-app-template](https://github.com/GDJiaMi/jm-app-template): React 应用模板
- [jm-electron-template](https://github.com/GDJiaMi/jm-electron-template): React + Electron 应用模板
