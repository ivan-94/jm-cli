import fs from 'fs-extra'
import os from 'os'
import path from 'path'
import chalk from 'chalk'
import { execSync } from 'child_process'
import tar from 'tar'
import { writeJSON } from '../../utils'

function getInstallPackage(templateName: string, cwd: string) {
  if (templateName && templateName.match(/^file:/)) {
    return `file:${path.resolve(cwd, templateName.match(/^file:(.*)?$/)![1])}`
  }
  return templateName
}

function tryPack(templateName: string) {
  const cmd = `npm pack ${templateName} --dry-run --json`
  try {
    const res = execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] })
    return res.toString().trim()
  } catch (err) {
    handleError(err)
  }
}

function handleError(err: { stdout?: Buffer }) {
  if (err.stdout) {
    try {
      const message = JSON.parse(err.stdout.toString()) as { error: { code: string; summary: string } }
      console.log(chalk.red(`Failed to download template:\n ${chalk.reset(message.error.summary)}`))
    } catch {
      console.log(chalk.red(`Failed to download template:`))
      console.log(err)
    }
  } else {
    console.log(chalk.red(`Failed to download template:`))
    console.log(err)
  }
  process.exit(1)
}

async function extraPack(packName: string, target: string) {
  fs.ensureDirSync(target)
  return tar.x({
    file: packName,
    C: target,
  })
}

function getAbsolutePath(base: string) {
  return path.resolve(path.join(base, 'package'))
}

/**
 * 获取和下载自定义模板
 */
export default async function getTemplate(force: boolean, ownPath: string, cwd: string, templateName?: string) {
  if (templateName == null) {
    // default template
    return path.join(ownPath, 'template')
  }

  // install template from npm
  templateName = getInstallPackage(templateName, cwd)
  const tempDir = path.join(os.tmpdir(), '.jm')

  fs.ensureDirSync(tempDir)
  process.chdir(tempDir)

  const templateJson = path.join(tempDir, 'template.json')
  const templateJsonExisted = fs.existsSync(templateJson)
  let pkg: {
    [templateName: string]: {
      packName: string
      path: string
    }
  } = {}

  const packName = tryPack(templateName) as string

  // 已存在, 不需要重复下载
  if (templateJsonExisted) {
    pkg = fs.readJsonSync(templateJson)
    if (!force && templateName in pkg && pkg[templateName].packName === packName) {
      return getAbsolutePath(pkg[templateName].path)
    }
  }

  try {
    console.log(`Downloading template from ${chalk.cyan(templateName)}...`)

    const cmd = `npm pack ${templateName} --json`
    execSync(cmd, { stdio: ['ignore', 'ignore', 'inherit'] })
    const extraPath = path.basename(packName, path.extname(packName))

    await extraPack(packName, extraPath)

    pkg[templateName] = {
      packName,
      path: extraPath,
    }

    writeJSON('template.json', pkg)

    return getAbsolutePath(extraPath)
  } catch (err) {
    handleError(err)
    return ''
  }
}
