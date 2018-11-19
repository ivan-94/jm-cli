---
id: cli
title: CLI
sidebar_label: CLI
---

## Create

创建项目, 并将`jm-cli`作为开发依赖安装, 并注入一些常用的命令作为`npm script`. 如:

```json
  "scripts": {
    "start": "jm start",
    "build": "jm build",
    "serve": "jm serve",
    "analyze": "jm analyze"
  }
```

```shell
jm create [name] [options]

```

| Options                    | Description                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| --template -t [npm-module] | 指定自定义模板. 模板可以是任意合法的`npm module`. 详情参考[`npm-install`](https://docs.npmjs.com/cli/install) |
| --force -f                 | 总是下载新的模板, 忽略缓存                                                                                    |
| --at -a [version]          | 限定安装的`jm-cli`的依赖版本                                                                                  |

### 使用示例

```shell
# 指定本地template, 可以用于自定义模板测试
jm create --template file:./my-template

# 指定tarball 文件
jm create --template file:./package.tgz

# 指定github版本库
jm create --template https://github.com/indexzero/forever/tarball/v0.5.6

# 指定npm公共包
jm create --template @gdjiami/app-template

# 指定jm-cli的版本
jm create --at 0.1.20
```

## Start

开启开发服务器, 默认使用 8080 端口(可以通过`PORT`环境变量配置), `jm-cli`会自动打开默认浏览器

| Options              | Description                   |
| -------------------- | ----------------------------- |
| --entry -e [entries] | 显式指定入口文件, 使用','分隔 |
| --inspect            | 检查 webpack 配置             |

### 使用示例

```shell
jm start -e a,b
```

## Build

编译生产环境包. `public`目录的静态文件以及编译结果将输出到`dist`目录. 默认会编译所有 src 下的入口文件

| Options                      | Description                                          |
| ---------------------------- | ---------------------------------------------------- |
| --inspect                    | 检查 webpack 配置                                    |
| --entry -e [entries]         | 显式指定入口文件, 使用','分隔                        |
| --group [entries]            | 应用分组. 可以指定多个--group, 入口名之间使用','分隔 |
| --group.[groupName][entries] | 同上, 显式指定分组名                                 |
| --dont-clean                 | 不要清除 dist 目录                                   |
| --dont-copy                  | 不要拷贝 public 到 dist                              |
| --measure                    | webpack 性能检测                                     |

### 使用示例

```shell
# 指定编译的页面
jm build --entry a,b

# 应用分组
jm build --group.admin admin,admin2 --group.app app,app2

# 只编译后台, 保留其他页面的编译结果
jm build --group.admin admin,admin2 --dont-clean
```

## Analyze

使用 `webpack-bundle-analyzer` 对生成环境包进行分析. 用于分析依赖树, 以便 chunks 拆包或合并优化.

参数和 `start`一样

```shell
jm analyze --entry admin
jm analyze
```

## Serve

开启服务器伺服`build`编译后的静态文件. 默认会使用和`start`一样的端口配置和代理配置.

| Options                   | Description                       |
| ------------------------- | --------------------------------- |
| --gzip -g                 | 开启 gzip. 默认为 true            |
| --open -o                 | 打开 浏览器                       |
| --history-api-fallback -f | history api fallback. 默认为 true |
| --cors                    | 开启 CORS                         |

## Upgrade

升级`jm-cli`. 如果是在`jm-cli` 创建的项目中调用该命令, 会检查升级项目本地依赖的 `jm-cli`版本.
否则检查升级全局安装的版本. 一般不需要显式调用该方法, 因为当你调用上述任意命令时, `jm-cli`会自动检查更新.

| Options      | Description                                           |
| ------------ | ----------------------------------------------------- |
| --dry-run -d | 简单检查更新, 不执行更新                              |
| --global -g  | 显式指定全局安装版本的更新                            |
| --yarn -y    | 使用 yarn, 如果发现本地系统有安装 yarn, 则默认为 true |
| --no-yarn    | 不使用 yarn                                           |
| --level -l   | 检查更新的级别.                                       |

更新级别有三个可选值:

- `major` 检查大版本的更新
- `minor` 检查次版本的更新
- `patch` 检查修订版本的更新

`jm-cli`遵循`semver`规范. 在全局更新模式, 默认为`major`, 而本地依赖更新模式默认为`minor`, 这是为了保证
本地依赖更新能够向下兼容.

当然你也可以直接使用`yarn upgrade`更新, 前提是将 `jm-cli`的 依赖版本号设置为'^'开头, 如`^0.1.0`. `yarn upgrade`会遵循
版本化的语义, 保证升级向下兼容.

详细 见[`npm的版本规范`](https://docs.npmjs.com/misc/semver)

```shell
# 全局
jm upgrade --global

# 强制使用npm
jm upgrade --no-yarn
```

## Clean

清除 `babel`和`cache-loader`的缓存. 如果新增了依赖或者遇到编译问题, 应该首先删除掉这些缓存

## Version

查看版本

## Help

查看 CLI 帮助

```shell
jm help

jm help create

```

## 通用参数

| Options | Description |
| ------- | ----------- |
|         |             |
