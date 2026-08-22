import type express from 'express'

import type { Role } from './database.js'

export type AuthPayload = { sub: string; email: string; role: Role; iat: number; exp: number }
export type AuthRequest = express.Request & { auth?: AuthPayload }
