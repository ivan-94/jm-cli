/**
 * polyfill生成
 */
import { CommonOption } from './type'
import path from 'path'
import terser from 'terser'
import fs from 'fs-extra'
import builder from 'core-js-builder'
import compat from 'core-js-compat'
import paths from '../paths'
import uniq from 'lodash/uniq'
import { message } from '../utils'

export interface PolyfillOption extends CommonOption {
  out?: string
}

const defaultFeatures = [
  'es.promise',
  'es.array.from',
  'es.array.of',
  'es.array.fill',
  'es.array.index-of',
  'es.array.find-index',
  'es.array.find',
  'es.object.assign',
  'es.object.keys',
  'es.string.ends-with',
  'es.string.starts-with',
  'es.string.includes',
  'es.symbol.iterator',
  'es.symbol.species',
  'es.map',
  'es.set',
]

export default async (argv: PolyfillOption) => {
  const out = argv.out! || 'public/polyfill.js'
  const pkg = fs.readJSONSync(paths.appPackageJson)
  const fullPath = path.isAbsolute(out) ? out : path.join(process.cwd(), out)

  fs.mkdirpSync(path.dirname(fullPath))

  const customFeature = pkg.polyfills || []
  const targets = pkg.browserslist || []

  const allFeatures = uniq(defaultFeatures.concat(customFeature))
  const { list } = compat({ targets })
  const finalFeatures = allFeatures.filter(i => list.indexOf(i) !== -1)

  message.info(`将添加以下特性到: ${fullPath}`)
  finalFeatures.forEach(i => console.log(i))

  try {
    const code = await builder({
      targets,
      modules: finalFeatures,
    })
    fs.writeFileSync(fullPath, terser.minify(code, {}).code, 'utf8')
    message.success('构建成功')
  } catch (err) {
    message.error('构建失败')
    console.error(err)
    process.exit(1)
  }
}
