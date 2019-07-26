---
id: configurations
title: Configurations
sidebar_label: Configurations
---

`jm-cli`通过`package.json`中的`jm`字段来进行配置. 这些配置主要影响`jm-cli`的构建行为. 虽然
部分内置环境变量也可以影响构建行为, 但是需要对它们有所区别:

- 环境变量可以在用户代码中访问; 而配置是不可以的
- 环境变量只支持字符串; 而配置支持 JSON 标准, 未来可能直接使用 Javascript 模块进行配置(因为 JSON 不支持函数)
- 环境变量初衷是为了定义环境, 而环境是多变的, 开发者可以通过`.env.*.local`文件或者直接使用环境变量来覆盖默认的环境变量;
  而配置是不变的, 你不会随意改动它, 应该在所有团队成员中保持一致.

如果你使用`VsCode`, 由`jm-cli`创建的项目支持在配置`package.json`进行智能提醒. 目前支持的可配置有:

## proxy 设置代理

`jm-cli`内部使用[`http-proxy-middleware`](https://github.com/chimurai/http-proxy-middleware)对请求进行代理,
支持`WebSocket`和 HTTPS. 最简单的配置是:

```json
"jm": {
  "proxy": {
    "/api": {
      "target": "http://192.168.78.124:8080"
    }
  }
}
```

上面的规则表示将所有`/api*`请求映射到`http://192.168.78.124:8080/api*`. 另外常见的配置选项有:

- `secure(boolean)` 是否需要检查 SSL 证书, 一般设置为 false. 因为开发环境一般都是自签名证书
- `changeOrigin(boolean)` 是否将被代理请求 Header 的 Host 修改为目标服务器. 默认是 false, 即 Host 就是你的本地机器. 大部分情况下开启
- `ws(boolean)` 是否需要代理`WebSocket`

支持的配置格式如下, 由于使用 JSON 进行配置, 所以不支持`http-proxy-middleware`的所有配置类型, 大部分情况下也不会有
如此复杂的配置需求.

```javascript
// 对象形式
"proxy": {
  "context1": "target1",
  "context2" {
    "target": "target2"
    // ...
  }
}

// 数组形式
"proxy": [
  {
    "context": "/api",
    "target": "xxx",
    // ...option
  },
  {
    // 配置多个context
    "context": ["/api1", "/api2"],
    "target": "xxx",
    // ...option
  }
]
```

为了避免改动配置, `jm-cli`支持对`proxy`的**context**和**target**字段进行"变量展开", 使用方式和[环境变量展开]():

```json
{
  "jm": {
    "proxy": {
      "${JM_API_ROOT}": {
        "target": "${JM_DEV_SERVER}",
        "changeOrigin": true,
        "secure": false
      }
    }
  }
}
```

## importPlugin

`antd`和`antd-mobile`这类组件库依赖[`babel-import-plugin`](https://www.npmjs.com/package/babel-plugin-import)来实现组件的按需导入.
在`jm-cli`中使用`importPlugin`配置项进行配置:

```json
"jm": {
  "importPlugin": [
    {
      "libraryName": "antd",
      "libraryDirectory": "es",
      "style": "css"
    },
    {
      "libraryName": "@gdjiami/rc-components",
      "libraryDirectory": "es",
      "style": "css"
    }
  ],
}
```

配置细节见[`babel-import-plugin`](https://www.npmjs.com/package/babel-plugin-import)

## 其他配置项

### enableDuplicatePackageCheck

![duplicate package](assets/duplicate-package.png)

是否开启重复模块检查. 默认开启, 在`build`命令执行时进行检查. 它可以检测出你程序中是否依赖于多个不同版本的包.

查看[如何修复引用多个版本的包](https://github.com/darrenscerri/duplicate-package-checker-webpack-plugin#resolving-duplicate-packages-in-your-bundle)

### enableCircularDependencyCheck

是否开启对循环依赖的检测. 默认开启, 在`build`命令执行时进行检查.