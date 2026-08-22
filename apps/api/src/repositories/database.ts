import mysql from 'mysql2/promise'

import { databaseConfig } from '../config/environment.js'

const dbCluster = mysql.createPoolCluster({
  canRetry: true,
  defaultSelector: 'ORDER',
  removeNodeErrorCount: 1,
  restoreNodeTimeout: 5000,
})

dbCluster.add('primary', {
  ...databaseConfig.primary,
  connectionLimit: 5,
  connectTimeout: 3000,
  decimalNumbers: true,
})
dbCluster.add('docker-fallback', {
  ...databaseConfig.fallback,
  connectionLimit: 5,
  connectTimeout: 3000,
  decimalNumbers: true,
})

// ORDER always tries the primary node before the Docker fallback.
export const db = dbCluster.of('*', 'ORDER')

export function databaseErrorMessage(error: unknown) {
  const code = (error as { code?: string }).code
  const message = error instanceof Error ? error.message : 'Kesalahan database tidak diketahui.'
  const { primary } = databaseConfig
  if (code === 'ER_ACCESS_DENIED_ERROR') {
    return `Akses MySQL ditolak untuk ${primary.user}@${primary.host}:${primary.port}/${primary.database}. Jalankan npm run db:setup-local atau sesuaikan DB_USER/DB_PASSWORD di .env.`
  }
  if (code === 'ER_BAD_DB_ERROR') {
    return `Database ${primary.database} belum ada di MySQL lokal. Jalankan npm run db:setup-local.`
  }
  if (code === 'ECONNREFUSED' || code === 'POOL_NONEONLINE') {
    return `MySQL belum tersambung. Pastikan MySQL lokal aktif di ${primary.host}:${primary.port}, atau jalankan fallback Docker dengan npm run db:up.`
  }
  return message
}
