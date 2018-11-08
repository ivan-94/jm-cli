import yargs from 'yargs'
import path from 'path'
import { transformString2Array } from './utils'
import create from './cmds/create'
import start from './cmds/start'
import build from './cmds/build'

const cwd = process.cwd()
const cmdDir = path.resolve(__dirname, '../')
const cmdName = process.argv

const argv = yargs
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
      start(cwd, cmdDir, { entry: argv.entry })
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
      let entry: string[] | undefined = argv.entry
      if (argv.group && argv.group.default) {
        entry = [...(entry || []), ...argv.group.default]
        argv.group = undefined
      }

      build({ entry, group: argv.group })
    },
  )
  .command('analyze', 'Analyze webpack bundle', {}, argv => {})
  .command('deploy', 'TODO', {}, argv => {})
  .help().argv
