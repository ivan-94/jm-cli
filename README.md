# CLI

**[Getting Started](https://gdjiami.github.io/jm-cli)**

CLI for build Typescript & React App
jm-cli 是 mygzb 前端团队使用的项目运行和构建工具。提供了高性能, 强团队编码规范, 约定大于配置的构建环境. 可以让开发者更专注于业务的开发, 增强项目的可维护性.

## 安装

```shell
yarn global add @gdjiami/cli
# or
npm i -g @gdjiami/cli

jm help
```

jm-cli 支持在全局模式调用，也支持作为项目的依赖调用。我们推荐后者，因为他和项目是绑定版本的，不会应该版本不兼容而无法运行。

## 创建项目

```shell
jm create my-app
```

上面的命令将创建一个默认的项目。 项目结构如下:

```sh
my-app
├── README.md
├── node_modules
├── package.json
├── yarn.lock
├── global.d.ts
├── tsconfig.json
├── tslint.json
├── .gitignore
├── .env
├── .env.production
├── .env.development
├── public
└── src
    ├── layouts
    |   └── layout.pug
    ├── css
    |   └── ...
    ├── components
    |   └── ...
    ├── containers
    |   └── ...
    ├── admin.pug
    ├── admin.tsx
    ├── index.pug
    └── index.tsx
```

jm-cli 天然支持多页应用，这里的 admin.pug 和 index.pug 就是两个应用入口。jm-cli 会搜索与它们同名的 Typescript 入口文件。 项目结构的具体详情将在 Folder Structure 中说明。现在可以打开项目目录运行:

```shell
cd my-app
```

## NPM Scripts

新创建的项目会内置以下命令

### start

在开发服务器中运行，默认运行在 8080 端口，在启动成功后会自动开发默认浏览器.

### build

编译生产环境包，资源将输出到 dist 目录

### serve

运行生产环境包。这个命令会采用和 start 一样的配置（例如端口和代理配置）来运行服务器，方便测试生产环境包.

### analyze

对 webpack 的生产环境包构建进行分析，方便开发者对应用进行拆包优化.

## License

jm-cli is open source software licensed as [MIT](LICENSE).
