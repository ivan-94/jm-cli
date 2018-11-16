import fs from 'fs-extra'
import chalk from 'chalk'

export default function getTslintConfig(configPath: string, enviroments: { [key: string]: string }) {
  if (enviroments.UNSAFE_DISABLE_TSLINT === 'true') {
    console.log(
      chalk.yellow(
        `⚠️ Warning: ${chalk.cyan('UNSAFE_DISABLE_TSLINT')} was turn on. Please follow the team development guidelines`,
      ),
    )
    return false
  }

  if (!fs.existsSync(configPath)) {
    // TODO:
    chalk.yellow(
      `⚠️ Warning: tslint not found in ${chalk.cyan(configPath)}. type ${chalk.blueBright(
        'jm create-tslint',
      )} to create one.`,
    )
    return false
  }

  return configPath
}
