import yargs from 'yargs'
import path from 'path'
import create from './cmds/create'
import start from './cmds/start'
import build from './cmds/build'

const cwd = process.cwd()
const cmdDir = path.resolve(__dirname, '../')
const argv = yargs
  .command(
    'create [name]',
    'Create React project',
    {
      name: { description: 'project name' },
    },
    argv => {
      create(cwd, argv.name, cmdDir)
    },
  )
  .command('start', 'Start development server', {}, argv => {
    // TODO: --entry=a,b --name
    start(cwd, cmdDir)
  })
  .command('build', 'Build project for development', {}, argv => {
    build()
  })
  .command('analyze', 'Analyze webpack bundle', {}, argv => {})
  .command('deploy', 'TODO', {}, argv => {}).argv
