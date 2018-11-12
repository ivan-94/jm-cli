/**
 * create ssl certificate
 */
import path from 'path'
import fs from 'fs-extra'
import createCertificate from 'webpack-dev-server/lib/utils/createCertificate'

export function getCerts(): {
  key: Buffer
  cert: Buffer
} {
  const certPath = path.join(__dirname, '../ssl/server.pem')
  let certExisted = fs.existsSync(certPath)
  // 检查是否过期
  if (certExisted) {
    const certTtl = 1000 * 60 * 60 * 24
    const certStat = fs.statSync(certPath)

    const now = new Date()

    // cert is more than 30 days old, kill it with fire
    if ((now.getTime() - certStat.ctime.getTime()) / certTtl > 30) {
      fs.removeSync(certPath)
      certExisted = false
    }
  }

  if (!certExisted) {
    const attrs = [{ name: 'commonName', value: 'localhost' }]
    const pems = createCertificate(attrs)

    fs.writeFileSync(certPath, pems.private + pems.cert, { encoding: 'utf-8' })
  }

  const cert = fs.readFileSync(certPath)
  return {
    key: cert,
    cert: cert,
  }
}
