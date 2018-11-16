---
id: folder-structure
title: Folder Structure
sidebar_label: Folder Structure
---

默认的项目结构如下

```shell
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
    ├── utils
    |   ├── inject.ts
    |   └── index.ts
    ├── ...
    ├── admin.pug
    ├── admin.tsx
    ├── index.pug
    └── index.tsx
```

### 配置文件

`.env*` 是项目配置文件，使用`dot-env`库进行解析。 按照加载的优先级排序如下：

- `.env.{NODE_ENV}.local` **NODE_ENV**为当前的环境.`start`命令下为`development`; `build`，`analyze`下为`production`. **local 后缀的会被`git`忽略**，所以用于放置开发者自己的配置项，这些配置项一般是多变的, 如代理地址。
- `.env.{NODE_ENV}` 会被`git`识别。用于放置指定环境的默认配置项
- `.env` 放置开发环境无关的配置项

### 静态文件

不需要经过 webpack 处理的静态文件放置在`public`目录下, 如`favicon`. 这些文件在 `start` 时可以被开发服务器伺服。在 `build` 执行时, 被复制到`dist`目录

### 入口文件

`src/{ENTRY}.pug` + `src/{ENTRY}.tsx` 定义应用的入口。在`create`默认创建的项目中，使用`pug`作为模板引擎，因为可以利用`pug`的一些特性(如 layout)减少多个入口文件的代码重复, 另外可以在`pug`文件中使用变量，甚至是导入其他资源。 例如:

```pug
html
  head
    meta(name="version" content=VERSION)
  body
    img(src=require('~imgs/myimg.png'))
```

当然这不是强制的，可在在配置文件中设置`PAGE_EXT=.html`使用 html 作为模板文件的扩展名.

在运行或编译项目时，`jm-cli`会先搜索 src 下的 html 模板文件，并将同名的 Typescript 文件作为 webpack 的入口文件. 所以要求**模板文件名和 Typescript 入口文件名必须保持一致**

### React 组件

按照组件的类型划分为`Container`和`Component`:

- `Container` 是有状态的，一般是页面, 包含业务逻辑。
- `Component` 则是无状态或者说无业务状态的，它们可以被多个 Container 中共享。

在`containers`内部文件结构可以进一步细化：

```shell
containers/
  ├── Admin/             # 后台模块
  |   ├─── Dashboard/     # 页面
  |   ├─── Settings/
  |   ├─── Orders/
  |   |  ├─── model.ts   # 具体子模块model
  |   |  ├─── style.css
  |   |  └─── index.tsx
  |   ├── index.ts       # hu根组件
  |   ├── model.ts       # 根Model
  |   ├── Routes.tsx     # 定义路由
  |   ├── style.css      # 全局样式
  |   └── stores.ts      # 聚合所有models
  └── App/               # 前台模块
      └─....
```

如果是多页应用，结构可以像上面一样。在`containers`下面创建`子模块`目录， 例如`Admin`, `App`. 如果是单页应用不需要
再嵌套这一层。例如:

```shell
containers/
  ├─── Dashboard/     # 页面
  ├─── Settings/
  ├─── Orders/
  |  ├─── model.ts   # 具体子模块model
  |  ├─── style.css
  |  └─── index.tsx
  ├── index.ts       # 根组件          ----+
  ├── model.ts       # 根Model             |
  ├── Routes.tsx     # 定义路由             |-----> 这些文件也可以提取到src根目录
  ├── style.css      # 全局样式             |
  └── stores.ts      # 聚合所有models  -----+
```

### src 其他目录规范，及模块引用方式

除了`components`和`containers`, 还可以定义以下常见的目录:

- `utils` 方法工具函数
- `css` 或 `style` 放置 css 文件. 但是我们更推荐使用`CSS-in-js`模式, 直接生成 React 组件, 让样式更语义化.
- `icons` 放置 svg icons. `jm-cli`支持获取它们的链接也支持转换成 React 组件形式进行引用
- `images` 放置图片
- `services` 放置公共服务

`jm-cli`只会处理放置在`src`下的文件. 这样可以提高重新编译的速度.

可以使用`~/*`来导入`src`目录下的模块, 例如`~/icons/logo.svg` 相当于`{project root}/src/icons/logo.svg`.

使用这种方式可以避免使用相对路径来引用模块, 例如`../../icons/logo.svg`, 这样会导致模块导入语句变得难以维护.
特别是当文件迁移到其他目录时.

### Typescript 相关文件

根目录下存在三个目录, 主要影响 Typescript 类型检查:

- `tsconfig.json` typescript 项目配置, 会影响类型检查. 开发者一般要避免去修改它的配置. 将来`tsconfig.json`的
  `extends`功能完善了, 配置会集成进`jm-cli`代码库中.(这个功能将在 Typescript3.2 中实现)
- `tslint.json` 主要用于限制代码规范. 它扩展了`jm-cli`内部定义 tslint 规则, 这份规则是团队开发的规范定义. 所以开发者
  一般不需要去修改里面的规则.
- `global.d.ts` 全局的类型声明. 主要用于对未提供类型声明文件的第三方库, 进行类型声明.
