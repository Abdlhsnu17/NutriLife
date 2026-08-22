import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

export const projectRoot = fileURLToPath(new URL('../../../../', import.meta.url))

dotenv.config({ path: process.env.ENV_FILE ?? resolve(projectRoot, '.env'), quiet: true })

export const port = Number(process.env.PORT ?? 4004)
export const serverUrl = process.env.SERVER_URL ?? `http://localhost:${port}`
export const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000'
export const jwtSecret = process.env.JWT_SECRET || 'nutrilife-development-secret-change-me'
export const uploadPublicPath = '/uploads'
export const uploadDir = resolve(projectRoot, process.env.UPLOAD_DIR ?? 'storage/uploads')

export const databaseConfig = {
  primary: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'nutrilife',
    password: process.env.DB_PASSWORD ?? 'nutrilife',
    database: process.env.DB_NAME ?? 'nutrilife',
  },
  fallback: {
    host: process.env.DB_FALLBACK_HOST ?? 'localhost',
    port: Number(process.env.DB_FALLBACK_PORT ?? 3307),
    user: process.env.DB_FALLBACK_USER ?? process.env.DB_USER ?? 'nutrilife',
    password: process.env.DB_FALLBACK_PASSWORD ?? process.env.DB_PASSWORD ?? 'nutrilife',
    database: process.env.DB_FALLBACK_NAME ?? process.env.DB_NAME ?? 'nutrilife',
  },
} as const
