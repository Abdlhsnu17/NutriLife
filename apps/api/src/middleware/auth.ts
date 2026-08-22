import type express from 'express'

import { db } from '../repositories/database.js'
import type { UserRow } from '../types/database.js'
import type { AuthRequest } from '../types/http.js'
import { verifySessionToken } from '../utils/auth.js'

export async function requireAuth(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ')
  const payload = scheme === 'Bearer' && token ? verifySessionToken(token) : null
  if (!payload) return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Silakan login kembali.' })
  try {
    const [users] = await db.execute<UserRow[]>('SELECT id, email, name, role, passwordHash FROM `User` WHERE id = ? LIMIT 1', [payload.sub])
    if (!users[0]) return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Akun tidak ditemukan.' })
    req.auth = { ...payload, email: users[0].email, role: users[0].role }
    return next()
  } catch (error) { return next(error) }
}
