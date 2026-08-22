import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import mysql from 'mysql2/promise'

const adminHost = process.env.MYSQL_ADMIN_HOST ?? process.env.DB_HOST ?? '127.0.0.1'
const adminPort = Number(process.env.MYSQL_ADMIN_PORT ?? process.env.DB_PORT ?? 3306)
const adminUser = process.env.MYSQL_ADMIN_USER ?? 'root'

async function askPassword() {
  if (process.env.MYSQL_ADMIN_PASSWORD !== undefined) return process.env.MYSQL_ADMIN_PASSWORD
  const rl = createInterface({ input, output })
  try {
    return await rl.question(`Password MySQL admin untuk ${adminUser}@${adminHost}:${adminPort} (kosongkan jika tidak ada): `)
  } finally {
    rl.close()
  }
}

async function main() {
  const password = await askPassword()
  const connection = await mysql.createConnection({
    host: adminHost,
    port: adminPort,
    user: adminUser,
    password,
    multipleStatements: true,
  })

  try {
    const setupSql = await readFile('database/schema/setup-local-mysql.sql', 'utf8')
    const schemaSql = await readFile('database/schema/schema.sql', 'utf8')
    await connection.query(setupSql)
    await connection.query(schemaSql)
    console.log(`MySQL lokal siap: ${process.env.DB_USER ?? 'nutrilife'}@${process.env.DB_HOST ?? '127.0.0.1'}:${process.env.DB_PORT ?? 3306}/${process.env.DB_NAME ?? 'nutrilife'}`)
  } finally {
    await connection.end()
  }
}

main().catch(error => {
  console.error('Gagal menyiapkan MySQL lokal.')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
