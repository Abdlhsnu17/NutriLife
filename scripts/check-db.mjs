import 'dotenv/config'
import mysql from 'mysql2/promise'

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

await check('MySQL phpMyAdmin/local', {
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'nutrilife',
  password: process.env.DB_PASSWORD ?? 'nutrilife',
  database: process.env.DB_NAME ?? 'nutrilife',
})
