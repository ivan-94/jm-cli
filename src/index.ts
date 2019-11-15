import fs from 'fs-extra'
import yargs from 'yargs'
import path from 'path'
import { transformString2Array, transformGroup } from './utils'
import { StartOption } from './cmds/start'
import { BuildOption } from './cmds/build'
import { AnalyzeOption } from './cmds/analyze'
import { ServeOption } from './cmds/serve'
import { UpgradeOption } from './cmds/upgrade'
import { PolyfillOption } from './cmds/polyfill'
import { DllOption } from './cmds/dll'
import wrap from './middlewares'

process.on('uncaughtException', err => {
  throw err
})

const cwd = process.cwd()
const cmdDir = path.resolve(__dirname, '../')
const pkg = fs.readJSONSync(path.join(cmdDir, 'package.json'))
const name = pkg.name
const version = pkg.version
const cmdName = Object.keys(pkg.bin)[0]

yargs
  .scriptName(cmdName)
  .command(
    'create [name]',
    'Create React project',
    {
      force: { description: 'disable template cache', alias: 'f', type: 'boolean' },
      at: { description: 'sepcify jm-cli version', alias: 'a', type: 'string', requiresArg: true },
      template: { description: 'template name in npm, file:// or url', alias: 't', type: 'string', requiresArg: true },
    },
    wrap(argv => {
      require('./cmds/create').default(cwd, cmdDir, {
        name: argv.name,
        version: argv.at,
        template: argv.template,
      })
    }),
  )
  .command(
    ['start', '$0'],
    'Start development server',
    {
      entry: {
        description: 'sepcify entry names to build. example: a,b',
        alias: 'e',
        type: 'string',
        requiresArg: true,
        coerce: transformString2Array,
      },
      'auto-reload': {
        description: 'auto reload electron main process',
        type: 'boolean',
        alias: 'a',
        default: true,
      },
      'electron-inspect': {
        description: 'activate inspector on host:port, default :5858',
        type: 'string',
      },
      'electron-inspect-brk': {
        description: 'activate inspector on host:port and break at start of user script, default :5858',
        type: 'string',
      },
    },
    wrap(argv => {
      require('./cmds/start').default(argv as StartOption)
    }),
  )
  .command(
    'build',
    'Build project for production',
    {
      entry: {
        description: 'sepcify entry names to build. example: a,b',
        alias: 'e',
        type: 'string',
        requiresArg: true,
        coerce: transformString2Array,
      },
      'cache-by-npm-verison': {
        description: 'cache build output by npm version',
        type: 'boolean',
      },
      'dont-clean': {
        description: "don't clean dist folder",
        type: 'boolean',
      },
      'dont-copy': {
        description: "don't copy files in `public`",
        type: 'boolean',
      },
      group: {
        desc: `sepcify entry group. It will override --entry. example --group.client=a,b --group.server=c,d`,
        type: 'string',
        requiresArg: true,
        coerce: transformGroup,
      },
      measure: {
        description: 'measures your webpack build speed',
        alias: 'm',
        type: 'boolean',
      },
    },
    wrap(argv => {
      let { entry, group, ...other } = argv as any
      if (group && group.default) {
        entry = [...(entry || []), ...group.default]
        group = undefined
      }

      require('./cmds/build').default({ entry, group, ...other } as BuildOption)
    }),
  )
  .command(
    'analyze',
    'Analyze webpack bundle',
    {
      entry: {
        description: 'sepcify entry names to build. example: a,b',
        alias: 'e',
        type: 'string',
        requiresArg: true,
        coerce: transformString2Array,
      },
      group: {
        desc: `sepcify entry group. It will override --entry. example --group.client=a,b --group.server=c,d`,
        type: 'string',
        requiresArg: true,
        coerce: transformGroup,
      },
    },
    wrap(argv => {
      require('./cmds/analyze').default(argv as AnalyzeOption)
    }),
  )
  .command(
    'dll',
    'generate or update Webpack Dll files',
    {},
    wrap(argv => {
      require('./cmds/dll').default(argv as DllOption)
    }),
  )
  .command(
    'serve',
    'serve builded content',
    {
      gzip: {
        description: 'enable gzip',
        alias: 'g',
        type: 'boolean',
        default: true,
      },
      cors: {
        description: 'enable CORS via the `Access-Control-Allow-Origin` header',
        type: 'boolean',
      },
      open: {
        description: 'open browser window after starting the server',
        alias: 'o',
        type: 'boolean',
      },
      f: {
        description: 'fall back to /index.html if nothing else matches',
        alias: 'history-api-fallback',
        type: 'boolean',
        default: true,
      },
    },
    wrap(argv => {
      require('./cmds/serve').default(argv as ServeOption)
    }),
  )
  .command(
    'polyfill',
    'generate polyfill base on browserslist',
    {
      out: {
        alias: 'o',
        type: 'string',
        default: 'public/polyfill.js',
      },
    },

    wrap(argv => {
      require('./cmds/polyfill').default(argv as PolyfillOption)
    }),
  )
  .command(
    'upgrade',
    `upgrade ${name} in current project or global`,
    {
      'dry-run': {
        alias: 'd',
        type: 'boolean',
      },
      global: {
        description: 'global upgrade',
        alias: 'g',
        type: 'boolean',
      },
      yarn: {
        description: 'use yarn to upgrade. default is true if `yarn` command founded',
        alias: 'y',
        type: 'boolean',
      },
      // yargs 可以自动将yarn置为false
      'no-yarn': {
        description: 'no use yarn to upgrade.',
        type: 'boolean',
      },
      level: {
        description: `choose semver level. Global mode default is 'major', local mode default is 'minor'`,
        alias: 'l',
        type: 'string',
        choices: ['major', 'minor', 'patch'],
      },
    },
    wrap(argv => {
      require('./cmds/upgrade').default(argv as UpgradeOption)
    }),
  )
  .command(
    'clean',
    'clean cache',
    {},
    wrap(argv => {
      require('./cmds/cleanCache').default()
    }),
  )
  // .command('deploy', 'TODO', {}, wrap(argv => {}))
  // .command('test', 'TODO', {}, wrap(argv => {}))
  .command('version', 'show version', {}, argv => {
    console.log(version)
  })
  .command('help', 'show helps', {}, () => {
    yargs.showHelp()
  })
  .version(version)
  .option('inspect', {
    description: 'inspect webpack configuration',
    type: 'boolean',
  })
  .strict()
  .help().argv
