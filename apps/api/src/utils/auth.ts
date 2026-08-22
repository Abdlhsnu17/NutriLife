import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

import { jwtSecret } from '../config/environment.js'
import type { UserRow } from '../types/database.js'
import type { AuthPayload } from '../types/http.js'

const scrypt = promisify(scryptCallback)

export function publicUser(user: UserRow) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatarUrl ?? null }
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const derived = await scrypt(password, salt, 64) as Buffer
  return `scrypt$${salt}$${derived.toString('hex')}`
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, hash] = storedHash.split('$')
  if (algorithm !== 'scrypt' || !salt || !hash) return false
  const expected = Buffer.from(hash, 'hex')
  const actual = await scrypt(password, salt, expected.length) as Buffer
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

function encode(value: object) { return Buffer.from(JSON.stringify(value)).toString('base64url') }

export function createSessionToken(user: UserRow) {
  const now = Math.floor(Date.now() / 1000)
  const header = encode({ alg: 'HS256', typ: 'JWT' })
  const payload = encode({ sub: user.id, email: user.email, role: user.role, iat: now, exp: now + 60 * 60 * 24 * 7 })
  const signature = createHmac('sha256', jwtSecret).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${signature}`
}

export function verifySessionToken(token: string): AuthPayload | null {
  const [header, payload, signature] = token.split('.')
  if (!header || !payload || !signature) return null
  const expected = createHmac('sha256', jwtSecret).update(`${header}.${payload}`).digest()
  const actual = Buffer.from(signature, 'base64url')
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AuthPayload
    if (!decoded.sub || !decoded.exp || decoded.exp <= Math.floor(Date.now() / 1000)) return null
    return decoded
  } catch { return null }
}
