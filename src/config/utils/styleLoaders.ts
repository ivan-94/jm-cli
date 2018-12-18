/**
 * generate style loaders
 */
import { RuleSetLoader } from 'webpack'
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

/**
 * @param environment 环境变量
 * @param cssOption css-loader 的参数
 * @param preProcessor 其他预处理器， 如sass
 */
export default (
  environment: StringObject,
  cssOption: object,
  preProcessor?: string,
  afterLoaders?: RuleSetLoader[],
) => {
  const { NODE_ENV, SOURCE_MAP, PUBLIC_URL } = environment
  const isProduction = NODE_ENV === 'production'
  const shouldUseRelativeAssetPaths = PUBLIC_URL === './' || PUBLIC_URL === '.'
  const shouldUseSourceMap = SOURCE_MAP !== 'false'

  const loaders = [
    !isProduction && require.resolve('style-loader'),
    isProduction && {
      loader: MiniCssExtractPlugin.loader,
      options: {
        publicPath: shouldUseRelativeAssetPaths ? '../../' : undefined,
      },
    },
    ...(afterLoaders || []),
    {
      loader: require.resolve('css-loader'),
      options: cssOption,
    },
    {
      loader: require.resolve('postcss-loader'),
      options: {
        ident: 'postcss',
        plugins: () => [
          require('postcss-flexbugs-fixes'),
          // 可以在package.json 中指定browserslist 选项，设置浏览器兼容列表
          // see more infomation in https://github.com/csstools/postcss-preset-env
          require('postcss-preset-env')({
            autoprefixer: {
              flexbox: 'no-2009',
            },
            stage: 3,
          }),
        ],
        sourceMap: isProduction && shouldUseSourceMap,
      },
    },
  ].filter(Boolean) as Array<RuleSetLoader | string>

  if (preProcessor) {
    loaders.push({
      loader: require.resolve(preProcessor),
      options: {
        sourceMap: isProduction && shouldUseSourceMap,
      },
    })
  }

  return loaders
}
