/**
 * babel 配置选项
 */
import { ImportPluginConfig } from '../type'
import { isModuleExistsInCwd, resolveModuleInCwd } from '../../utils'

// see more options in https://babeljs.io/docs/en/options
// Typescript + babel: see more in https://iamturns.com/typescript-babel/ q
// babel 的Typescript插件仅仅是移除了Typescript的语法.
// react-hot-loader 依赖babel插件
// babel 有强大的生态
export default (env: string, importPlugin?: ImportPluginConfig | ImportPluginConfig[]) => {
  const isDevelopment = env === 'development'
  const isProduction = env === 'production'

  return {
    babelrc: false,
    configFile: false,
    presets: [
      [
        require.resolve('@babel/preset-env'),
        {
          // We want Create React App to be IE 9 compatible until React itself
          // no longer works with IE 9
          targets: {
            ie: 9,
          },
          // Users cannot override this behavior because this Babel
          // configuration is highly tuned for ES5 support
          ignoreBrowserslistConfig: true,
          // If users import all core-js they're probably not concerned with
          // bundle size. We shouldn't rely on magic to try and shrink it.
          useBuiltIns: false,
          // Do not transform modules to CJS
          modules: false,
          // Exclude transforms that make all code slower
          exclude: ['transform-typeof-symbol'],
        },
      ],
      [
        require.resolve('@babel/preset-react'),
        {
          development: !isProduction,
          useBuiltIns: true,
        },
      ],
      require.resolve('@babel/preset-typescript'),
    ],
    plugins: [
      [require.resolve('@babel/plugin-proposal-decorators'), { legacy: true }],
      [require.resolve('@babel/plugin-proposal-class-properties'), { loose: true }],
      require.resolve('babel-plugin-macros'),
      require.resolve('@babel/plugin-transform-destructuring'),
      [require.resolve('@babel/plugin-proposal-object-rest-spread'), { useBuiltIns: true }],
      [
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
      isDevelopment && isModuleExistsInCwd('react-hot-loader') && resolveModuleInCwd('react-hot-loader/babel'),
      isProduction && [
        // Remove PropTypes from production build
        require.resolve('babel-plugin-transform-react-remove-prop-types'),
        {
          removeImport: true,
        },
      ],
      // support antd, antd-mobile
      ...(importPlugin
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
