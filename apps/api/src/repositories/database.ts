import mysql from 'mysql2/promise'

import { databaseConfig } from '../config/environment.js'

export const db = mysql.createPool({
  ...databaseConfig,
  connectionLimit: 5,
  connectTimeout: 3000,
  decimalNumbers: true,
})

export function databaseErrorMessage(error: unknown) {
  const code = (error as { code?: string }).code
  const message = error instanceof Error ? error.message : 'Kesalahan database tidak diketahui.'
  const database = databaseConfig
  if (code === 'ER_ACCESS_DENIED_ERROR') {
    return `Akses MySQL ditolak untuk ${database.user}@${database.host}:${database.port}/${database.database}. Periksa DB_USER dan DB_PASSWORD di .env agar cocok dengan akun MySQL lokal yang digunakan phpMyAdmin.`
  }
  if (code === 'ER_BAD_DB_ERROR') {
    return `Database ${database.database} belum tersedia di MySQL lokal ${database.host}:${database.port}. Pastikan database sudah dibuat di phpMyAdmin.`
  }
  if (code === 'ECONNREFUSED' || code === 'POOL_NONEONLINE') {
    return `MySQL belum tersambung. Pastikan MySQL lokal aktif di ${database.host}:${database.port}.`
  }
  return message
}
