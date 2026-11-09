import dotenv from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: process.env.ENV_FILE ?? resolve(projectRoot, '.env'), quiet: true })

export const databaseConfig = {
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'nutrilife',
  password: process.env.DB_PASSWORD ?? 'nutrilife',
  database: process.env.DB_NAME ?? 'nutrilife',
}
