import { readFile } from 'node:fs/promises'
import mysql from 'mysql2/promise'
import { databaseConfig as config } from './db-config.mjs'

async function main() {
  const connection = await mysql.createConnection({ ...config, database: undefined, multipleStatements: true })
  try {
    const databaseName = config.database.replaceAll('`', '``')
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
    await connection.query(`USE \`${databaseName}\``)
    const schemaSql = await readFile('database/schema/schema.sql', 'utf8')
    await connection.query(schemaSql)
    console.log(`MySQL siap: ${config.user}@${config.host}:${config.port}/${config.database}`)
  } finally {
    await connection.end()
  }
}

main().catch(error => {
  console.error('Gagal menyiapkan schema MySQL memakai akun aplikasi.')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
