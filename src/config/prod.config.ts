/**
 * 生产环境配置
 */
import path from 'path'
import { WebpackConfigurer } from './type'

const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')

const configure: WebpackConfigurer = (enviroments, pkg, paths, argv) => {
  const shouldUseRelativeAssetPaths = enviroments.raw.PUBLIC_URL === './'
  const cssFilename = 'static/css/[name].css?[contenthash]'

  return {
    module: {
      rules: [
        {
          test: /\.css$/,
          use: [
            {
              loader: MiniCssExtractPlugin.loader,
              options: {
                publicPath: shouldUseRelativeAssetPaths ? Array(cssFilename.split('/').length).join('../') : undefined,
              },
            },
            {
              loader: require.resolve('css-loader'),
              options: {
                importLoaders: 1,
                minimize: true,
              },
            },
            {
              loader: require.resolve('postcss-loader'),
              options: {
                ident: 'postcss',
                plugins: () => [
                  require('autoprefixer')({
                    browsers: ['last 2 versions'],
                  }),
                ],
              },
            },
          ],
        },
      ],
    },
    plugins: [
      // 拷贝静态资源
      new CopyWebpackPlugin([
        {
          from: path.join(paths.appPublic, '**/*'),
          to: paths.appDist,
          context: paths.appPublic,
        },
      ]),
      // 抽取CSS文件
      new MiniCssExtractPlugin({
        filename: cssFilename,
      }),
    ],
    optimization: {
      minimizer: [
        new UglifyJsPlugin({
          cache: true,
          parallel: true,
          sourceMap: true, // set to true if you want JS source maps
          uglifyOptions: {
            compress: {
              warnings: false,
            },
          },
        }),
      ],
    },
    performance: {
      hints: 'warning',
    },
  }
}

export default configure
