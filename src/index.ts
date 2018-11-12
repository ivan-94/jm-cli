import yargs from 'yargs'
import path from 'path'
import { transformString2Array } from './utils'
import create from './cmds/create'
import start, { StartOption } from './cmds/start'
import build, { BuildOption } from './cmds/build'
import analyze, { AnalyzeOption } from './cmds/analyze'

const cwd = process.cwd()
const cmdDir = path.resolve(__dirname, '../')

yargs
  .command(
    'create [name]',
    'Create React project',
    {
      name: { description: 'project name' },
      at: { description: 'sepcify jm-cli version', alias: 'a', type: 'string', requiresArg: true },
      template: { description: 'template name in npm, file:// or url', alias: 't', type: 'string', requiresArg: true },
    },
    argv => {
      create(cwd, cmdDir, {
        name: argv.name,
        version: argv.at,
        template: argv.template,
      })
    },
  )
  .command(
    'start',
    'Start development server',
    {
      entry: {
        description: 'sepcify entry names to build. example: a,b',
        alias: 'e',
        type: 'string',
        requiresArg: true,
        coerce: transformString2Array,
      },
    },
    argv => {
      start(argv as StartOption)
    },
  )
  .command(
    'build',
    'Build project for development',
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
        coerce: argv => {
          if (Array.isArray(argv)) {
            return argv.reduce<StringArrayObject>((group, cur) => {
              const entry = transformString2Array(cur)
              const name = entry.join('_')
              group[name] = entry
              return group
            }, {})
          } else if (typeof argv === 'string') {
            return { default: transformString2Array(argv) }
          }

          return Object.keys(argv).reduce<StringArrayObject>((group, cur) => {
            group[cur] = transformString2Array(argv[cur])
            return group
          }, {})
        },
      },
    },
    argv => {
      let { entry, group, ...other } = argv
      if (group && group.default) {
        entry = [...(entry || []), ...group.default]
        group = undefined
      }

      build({ entry, group, ...other } as BuildOption)
    },
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
    },
    argv => {
      analyze(argv as AnalyzeOption)
    },
  )
  .command('deploy', 'TODO', {}, argv => {})
  .option('inspect', {
    description: 'inspect webpack configuration',
    type: 'boolean',
  })
  .help().argv
