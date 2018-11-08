/**
 * 开发环境配置
 */
import webpack from 'webpack'
import { WebpackConfigurer } from './type'

const configure: WebpackConfigurer = (enviroments, pkg, paths, argv) => ({
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          require.resolve('style-loader'),
          {
            loader: require.resolve('css-loader'),
            options: {
              importLoaders: 1,
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
  plugins: [new webpack.NamedModulesPlugin(), new webpack.HotModuleReplacementPlugin()],
})

export default configure
