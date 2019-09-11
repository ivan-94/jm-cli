import fs from 'fs'
import path from 'path'

import { WebpackPaths } from '../../paths'
import { message } from '../../utils'

export default function eslintConfig(paths: WebpackPaths) {
  const eslintFiles = ['.eslintrc.js', '.eslintrc.json', '.eslintrc']
  const shouldUseEslint = eslintFiles.some(f => fs.existsSync(path.join(paths.appPath, f)))

  if (shouldUseEslint) {
    message.info('using override eslint config')
  }

  return {
    eslintPath: require.resolve('eslint'),
    resolvePluginsRelativeTo: __dirname,
    baseConfig: !shouldUseEslint && { extends: [require.resolve('@gdjiami/eslint-config')] },
    ignore: false,
    formatter: 'codeframe',
    useEslintrc: shouldUseEslint,
  }
}
