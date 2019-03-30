/**
 * babel 配置选项
 */
import { JMOptions } from '../type'
import { isModuleExistsInCwd, resolveModuleInCwd, requireInCwd } from '../../utils'

// see more options in https://babeljs.io/docs/en/options
// Typescript + babel: see more in https://iamturns.com/typescript-babel/ q
// babel 的Typescript插件仅仅是移除了Typescript的语法.
// react-hot-loader 依赖babel插件
// babel 有强大的生态

/**
 * @param env 当前环境
 * @param options 配置对象
 * @param electronMain 是否是electron主线程
 */
export default (env: string, options: JMOptions, electronMain?: boolean) => {
  const isDevelopment = env === 'development'
  const isProduction = env === 'production'
  const importPlugin = options.importPlugin
  const isElectron = options.electron

  return {
    babelrc: false,
    configFile: false,
    presets: [
      [
        require.resolve('@babel/preset-env'),
        {
          // 自动检查被转译的代码中是否使用了特性, 如果指定环境不存在, 则自动添加Polyfill
          // 注意, 这无法检测没有经过babel转译的代码中的特性, 如第三方库. 这些需要显式添加
          useBuiltIns: options.useBuiltIns,
          // Do not transform modules to CJS
          modules: false,
          // Exclude transforms that make all code slower
          exclude: ['transform-typeof-symbol'],
          corejs: 3,
          ...(isElectron
            ? {
                useBuiltIns: 'usage',
                targets: { electron: requireInCwd('electron/package.json').version },
                ignoreBrowserslistConfig: true,
              }
            : {}),
        },
      ],
      !electronMain && [
        require.resolve('@babel/preset-react'),
        {
          development: !isProduction,
          useBuiltIns: true,
        },
      ],
      require.resolve('@babel/preset-typescript'),
    ].filter(Boolean),
    plugins: [
      [require.resolve('@babel/plugin-proposal-decorators'), { legacy: true }],
      [require.resolve('@babel/plugin-proposal-class-properties'), { loose: true }],
      require.resolve('babel-plugin-macros'),
      require.resolve('@babel/plugin-transform-destructuring'),
      [require.resolve('@babel/plugin-proposal-object-rest-spread'), { useBuiltIns: true }],
      [
        // babel会注入一些帮助方法, 如_extends, generator等. 默认情况下, 这些helper都很小, 会在每个使用
        // 他们的模块中重复. 这样可能会导致包的体积变大. 使用这个插件会让模块通过导入@babel/runtime来导入helper.
        // @babel/runtime 类似于Typescript中的tslib
        // * 注意Polyfill和Helper的区别, Polyfill是环境的填充物, 而Helper是编译结果的运行时帮助方法
        // * Polyfill 可以通过@babel/polyfill定义
        require.resolve('@babel/plugin-transform-runtime'),
        {
          corejs: false,
          helpers: true,
          regenerator: true,
          // https://babeljs.io/docs/en/babel-plugin-transform-runtime#useesmodules
          // We should turn this on once the lowest version of Node LTS
          // supports ES Modules.
          useESModules: true,
        },
      ],
      require.resolve('@babel/plugin-syntax-dynamic-import'),
      !electronMain &&
        isDevelopment &&
        isModuleExistsInCwd('react-hot-loader') &&
        resolveModuleInCwd('react-hot-loader/babel'),
      !electronMain &&
        isProduction && [
          // Remove PropTypes from production build
          require.resolve('babel-plugin-transform-react-remove-prop-types'),
          {
            removeImport: true,
          },
        ],
      // support antd, antd-mobile
      ...(!electronMain && importPlugin
        ? (Array.isArray(importPlugin) ? importPlugin : [importPlugin]).map(i => [
            require.resolve('babel-plugin-import'),
            i,
            i.libraryName,
          ])
        : []),
    ].filter(Boolean),
    compact: isProduction,
    cacheDirectory: true,
    cacheCompression: isProduction,
  }
}
