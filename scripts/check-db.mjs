import mysql from 'mysql2/promise'
import { databaseConfig } from './db-config.mjs'

async function check(label, config) {
  try {
    const connection = await mysql.createConnection({ ...config, connectTimeout: 2500 })
    const [rows] = await connection.query('SELECT USER() AS user, CURRENT_USER() AS currentUser, DATABASE() AS databaseName')
    const [tables] = await connection.query('SHOW TABLES LIKE ?', ['User'])
    await connection.end()
    console.log(`${label}: OK ${rows[0].user} -> ${rows[0].databaseName} (table User: ${tables.length ? 'ada' : 'belum ada'})`)
  } catch (error) {
    const code = error?.code ?? 'ERROR'
    const message = error instanceof Error ? error.message : String(error)
    console.log(`${label}: GAGAL ${code} ${message}`)
  }
}

await check('MySQL phpMyAdmin/local', databaseConfig)
