"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const promise_1 = __importDefault(require("mysql2/promise"));
const node_crypto_1 = require("node:crypto");
const promises_1 = require("node:fs/promises");
const node_util_1 = require("node:util");
const zod_1 = require("zod");
const port = Number(process.env.PORT ?? 4004);
const serverUrl = process.env.SERVER_URL ?? `http://localhost:${port}`;
const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
const dbHost = process.env.DB_HOST ?? 'localhost';
const dbPort = Number(process.env.DB_PORT ?? 3306);
const dbUser = process.env.DB_USER ?? 'nutrilife';
const dbName = process.env.DB_NAME ?? 'nutrilife';
const dbFallbackHost = process.env.DB_FALLBACK_HOST ?? 'localhost';
const dbFallbackPort = Number(process.env.DB_FALLBACK_PORT ?? 3307);
const dbFallbackUser = process.env.DB_FALLBACK_USER ?? dbUser;
const dbFallbackName = process.env.DB_FALLBACK_NAME ?? dbName;
const uploadDir = process.env.UPLOAD_DIR ?? 'uploads';
const jwtSecret = process.env.JWT_SECRET || 'nutrilife-development-secret-change-me';
const scrypt = (0, node_util_1.promisify)(node_crypto_1.scrypt);
const dbCluster = promise_1.default.createPoolCluster({
    canRetry: true,
    defaultSelector: 'ORDER',
    removeNodeErrorCount: 1,
    restoreNodeTimeout: 5000,
});
dbCluster.add('primary', {
    host: dbHost, port: dbPort, user: dbUser,
    password: process.env.DB_PASSWORD ?? 'nutrilife', database: dbName,
    connectionLimit: 5, connectTimeout: 3000, decimalNumbers: true,
});
dbCluster.add('docker-fallback', {
    host: dbFallbackHost, port: dbFallbackPort, user: dbFallbackUser,
    password: process.env.DB_FALLBACK_PASSWORD ?? process.env.DB_PASSWORD ?? 'nutrilife',
    database: dbFallbackName,
    connectionLimit: 5, connectTimeout: 3000, decimalNumbers: true,
});
// ORDER always tries the local/primary MySQL node before the Docker fallback.
// Offline nodes are retried so the application automatically returns to primary.
const db = dbCluster.of('*', 'ORDER');
function databaseErrorMessage(error) {
    const code = error.code;
    const message = error instanceof Error ? error.message : 'Kesalahan database tidak diketahui.';
    if (code === 'ER_ACCESS_DENIED_ERROR') {
        return `Akses MySQL ditolak untuk ${dbUser}@${dbHost}:${dbPort}/${dbName}. Jalankan npm run db:setup-local atau sesuaikan DB_USER/DB_PASSWORD di .env.`;
    }
    if (code === 'ER_BAD_DB_ERROR') {
        return `Database ${dbName} belum ada di MySQL lokal. Jalankan npm run db:setup-local.`;
    }
    if (code === 'ECONNREFUSED' || code === 'POOL_NONEONLINE') {
        return `MySQL belum tersambung. Pastikan MySQL lokal aktif di ${dbHost}:${dbPort}, atau jalankan fallback Docker dengan npm run db:up.`;
    }
    return message;
}
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: frontendUrl }));
app.use(express_1.default.json({ limit: '10mb' }));
// serve uploaded files
app.use(`/${uploadDir}`, express_1.default.static(uploadDir, {
    setHeaders(response) {
        // The frontend and API use different ports, so profile images must be
        // embeddable across origins even though Helmet protects the API itself.
        response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
}));
const emailSchema = zod_1.z.string().trim().email().max(191).transform(value => value.toLowerCase());
const passwordSchema = zod_1.z.string().min(8).max(72).regex(/[A-Za-z]/, 'Password harus memiliki huruf').regex(/\d/, 'Password harus memiliki angka');
const registerSchema = zod_1.z.object({ name: zod_1.z.string().trim().min(2).max(120), email: emailSchema, password: passwordSchema });
const loginSchema = zod_1.z.object({ email: emailSchema, password: zod_1.z.string().min(1).max(72) });
const forgotSchema = zod_1.z.object({ email: emailSchema });
const resetSchema = zod_1.z.object({ token: zod_1.z.string().min(32).max(200), password: passwordSchema });
const profileSchema = zod_1.z.object({ name: zod_1.z.string().trim().min(2).max(120), email: emailSchema });
const changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1).max(72),
    newPassword: passwordSchema,
}).refine(value => value.currentPassword !== value.newPassword, {
    message: 'Password baru harus berbeda dari password saat ini.', path: ['newPassword'],
});
const staffRoleSchema = zod_1.z.enum(['NUTRITIONIST', 'ADMIN']);
const staffCreateSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(120),
    email: emailSchema,
    password: passwordSchema,
    role: staffRoleSchema,
});
const staffUpdateSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(120).optional(),
    email: emailSchema.optional(),
    password: passwordSchema.optional(),
    role: staffRoleSchema.optional(),
}).refine(value => Object.keys(value).length > 0, { message: 'Tidak ada perubahan.' });
const goalsSchema = zod_1.z.object({ goals: zod_1.z.object({
        CALORIES: zod_1.z.number().positive().max(20000), WATER: zod_1.z.number().positive().max(20000),
        STEPS: zod_1.z.number().positive().max(200000), WEIGHT: zod_1.z.number().positive().max(500),
        PROTEIN: zod_1.z.number().positive().max(1000), CARBS: zod_1.z.number().positive().max(1000), FAT: zod_1.z.number().positive().max(1000),
    }) });
const mealSchema = zod_1.z.object({
    mealType: zod_1.z.enum(['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER']), name: zod_1.z.string().trim().min(2).max(120),
    calories: zod_1.z.number().int().nonnegative().max(10000), protein: zod_1.z.number().nonnegative().max(1000).default(0),
    carbs: zod_1.z.number().nonnegative().max(1000).default(0), fat: zod_1.z.number().nonnegative().max(1000).default(0),
});
const waterSchema = zod_1.z.object({ amountMl: zod_1.z.number().int().positive().max(5000).default(250) });
const activitySchema = zod_1.z.object({ steps: zod_1.z.number().int().nonnegative().max(200000), duration: zod_1.z.number().int().nonnegative().max(1440).default(0), calories: zod_1.z.number().int().nonnegative().max(10000).default(0), activityType: zod_1.z.string().trim().min(2).max(120).default('Berjalan') });
const weightSchema = zod_1.z.object({ weight: zod_1.z.number().positive().max(500) });
const recipeQuerySchema = zod_1.z.object({
    q: zod_1.z.string().trim().min(2).max(80),
    limit: zod_1.z.coerce.number().int().min(1).max(20).default(8),
});
const nutritionItemQuerySchema = zod_1.z.object({
    q: zod_1.z.string().trim().min(2).max(80),
    limit: zod_1.z.coerce.number().int().min(1).max(20).default(8),
});
function publicUser(user) {
    return { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatarUrl ?? null };
}
async function hashPassword(password) {
    const salt = (0, node_crypto_1.randomBytes)(16).toString('hex');
    const derived = await scrypt(password, salt, 64);
    return `scrypt$${salt}$${derived.toString('hex')}`;
}
async function verifyPassword(password, storedHash) {
    const [algorithm, salt, hash] = storedHash.split('$');
    if (algorithm !== 'scrypt' || !salt || !hash)
        return false;
    const expected = Buffer.from(hash, 'hex');
    const actual = await scrypt(password, salt, expected.length);
    return expected.length === actual.length && (0, node_crypto_1.timingSafeEqual)(expected, actual);
}
function encode(value) { return Buffer.from(JSON.stringify(value)).toString('base64url'); }
function createSessionToken(user) {
    const now = Math.floor(Date.now() / 1000);
    const header = encode({ alg: 'HS256', typ: 'JWT' });
    const payload = encode({ sub: user.id, email: user.email, role: user.role, iat: now, exp: now + 60 * 60 * 24 * 7 });
    const signature = (0, node_crypto_1.createHmac)('sha256', jwtSecret).update(`${header}.${payload}`).digest('base64url');
    return `${header}.${payload}.${signature}`;
}
function verifySessionToken(token) {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature)
        return null;
    const expected = (0, node_crypto_1.createHmac)('sha256', jwtSecret).update(`${header}.${payload}`).digest();
    const actual = Buffer.from(signature, 'base64url');
    if (expected.length !== actual.length || !(0, node_crypto_1.timingSafeEqual)(expected, actual))
        return null;
    try {
        const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        if (!decoded.sub || !decoded.exp || decoded.exp <= Math.floor(Date.now() / 1000))
            return null;
        return decoded;
    }
    catch {
        return null;
    }
}
async function requireAuth(req, res, next) {
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    const payload = scheme === 'Bearer' && token ? verifySessionToken(token) : null;
    if (!payload)
        return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Silakan login kembali.' });
    try {
        // Refresh the role from MySQL on every protected request so role changes and
        // deleted accounts take effect immediately, even when an old JWT still exists.
        const [users] = await db.execute('SELECT id, email, name, role, passwordHash FROM `User` WHERE id = ? LIMIT 1', [payload.sub]);
        if (!users[0])
            return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Akun tidak ditemukan.' });
        req.auth = { ...payload, email: users[0].email, role: users[0].role };
        return next();
    }
    catch (error) {
        return next(error);
    }
}
app.get('/health', async (_req, res) => {
    try {
        await db.query('SELECT 1');
        return res.json({ status: 'ok', service: 'nutrilife-api', database: 'connected' });
    }
    catch (error) {
        return res.status(503).json({
            status: 'error',
            service: 'nutrilife-api',
            database: 'disconnected',
            message: databaseErrorMessage(error),
        });
    }
});
app.get('/api/v1/articles', async (req, res, next) => {
    try {
        const [rows] = await db.execute(`SELECT id, slug, title, category, excerpt, imageUrl, timeToRead, isNews, createdAt FROM Article ORDER BY createdAt DESC LIMIT 50`);
        // Map to a simple public shape
        const articles = rows.map(r => ({ slug: r.slug, title: r.title, category: r.category ?? null, excerpt: r.excerpt ?? null, imageUrl: r.imageUrl ?? null, time: r.timeToRead ?? null, isNews: Boolean(r.isNews) }));
        return res.json({ articles });
    }
    catch (error) {
        return next(error);
    }
});
app.get('/api/v1/articles/:slug', async (req, res, next) => {
    try {
        const [rows] = await db.execute('SELECT id, slug, title, category, excerpt, content, imageUrl, timeToRead, isNews, createdAt FROM Article WHERE slug = ? LIMIT 1', [req.params.slug]);
        const row = rows[0];
        if (!row)
            return res.status(404).json({ error: 'NOT_FOUND' });
        return res.json({ slug: row.slug, title: row.title, category: row.category ?? null, excerpt: row.excerpt ?? null, content: row.content, imageUrl: row.imageUrl ?? null, time: row.timeToRead ?? null, isNews: Boolean(row.isNews) });
    }
    catch (error) {
        return next(error);
    }
});
app.post('/api/v1/auth/register', async (req, res, next) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Periksa kembali data pendaftaran.', details: parsed.error.flatten() });
    const connection = await db.getConnection();
    try {
        const [existing] = await connection.execute('SELECT id FROM `User` WHERE email = ? LIMIT 1', [parsed.data.email]);
        if (existing[0])
            return res.status(409).json({ error: 'EMAIL_EXISTS', message: 'Email sudah terdaftar.' });
        const id = (0, node_crypto_1.randomUUID)();
        const passwordHash = await hashPassword(parsed.data.password);
        await connection.beginTransaction();
        await connection.execute('INSERT INTO `User` (id, email, name, passwordHash) VALUES (?, ?, ?, ?)', [id, parsed.data.email, parsed.data.name, passwordHash]);
        const goals = [
            ['CALORIES', 1800, 'kkal'], ['WATER', 2500, 'ml'], ['STEPS', 8000, 'langkah'],
            ['WEIGHT', 65, 'kg'], ['PROTEIN', 120, 'g'], ['CARBS', 220, 'g'], ['FAT', 60, 'g'],
        ];
        for (const [type, target, unit] of goals) {
            await connection.execute('INSERT INTO HealthGoal (id, userId, type, target, current, unit) VALUES (?, ?, ?, ?, 0, ?)', [(0, node_crypto_1.randomUUID)(), id, type, target, unit]);
        }
        await connection.commit();
        const [users] = await connection.execute('SELECT id, email, name, role, passwordHash, avatarUrl FROM `User` WHERE id = ?', [id]);
        return res.status(201).json({ token: createSessionToken(users[0]), user: publicUser(users[0]) });
    }
    catch (error) {
        await connection.rollback();
        return next(error);
    }
    finally {
        connection.release();
    }
});
app.post('/api/v1/auth/login', async (req, res, next) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Email atau password tidak valid.' });
    try {
        const [users] = await db.execute('SELECT id, email, name, role, passwordHash, avatarUrl FROM `User` WHERE email = ? LIMIT 1', [parsed.data.email]);
        const user = users[0];
        if (!user?.passwordHash || !(await verifyPassword(parsed.data.password, user.passwordHash)))
            return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Email atau password salah.' });
        return res.json({ token: createSessionToken(user), user: publicUser(user) });
    }
    catch (error) {
        return next(error);
    }
});
app.post('/api/v1/auth/forgot-password', async (req, res, next) => {
    const parsed = forgotSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Masukkan email yang valid.' });
    try {
        const [users] = await db.execute('SELECT id, email, name, role, passwordHash FROM `User` WHERE email = ? LIMIT 1', [parsed.data.email]);
        if (!users[0] && process.env.NODE_ENV !== 'production') {
            return res.status(404).json({ error: 'EMAIL_NOT_FOUND', message: 'Email belum terdaftar. Silakan buat akun terlebih dahulu.' });
        }
        let resetToken;
        if (users[0]) {
            resetToken = (0, node_crypto_1.randomBytes)(32).toString('hex');
            const tokenHash = (0, node_crypto_1.createHash)('sha256').update(resetToken).digest('hex');
            await db.execute('DELETE FROM PasswordResetToken WHERE userId = ? OR expiresAt < NOW(3)', [users[0].id]);
            await db.execute('INSERT INTO PasswordResetToken (id, userId, tokenHash, expiresAt) VALUES (?, ?, ?, DATE_ADD(NOW(3), INTERVAL 15 MINUTE))', [(0, node_crypto_1.randomUUID)(), users[0].id, tokenHash]);
        }
        const developmentReset = process.env.NODE_ENV !== 'production' && resetToken
            ? { resetToken, resetUrl: `${frontendUrl}/?resetToken=${encodeURIComponent(resetToken)}` }
            : {};
        return res.json({ message: 'Jika email terdaftar, instruksi reset password telah dibuat.', ...developmentReset });
    }
    catch (error) {
        return next(error);
    }
});
app.post('/api/v1/auth/reset-password', async (req, res, next) => {
    const parsed = resetSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Token atau password baru tidak valid.' });
    const tokenHash = (0, node_crypto_1.createHash)('sha256').update(parsed.data.token).digest('hex');
    const connection = await db.getConnection();
    try {
        const [tokens] = await connection.execute('SELECT id, userId FROM PasswordResetToken WHERE tokenHash = ? AND usedAt IS NULL AND expiresAt > NOW(3) LIMIT 1', [tokenHash]);
        if (!tokens[0])
            return res.status(400).json({ error: 'INVALID_RESET_TOKEN', message: 'Tautan reset tidak valid atau sudah kedaluwarsa.' });
        const passwordHash = await hashPassword(parsed.data.password);
        await connection.beginTransaction();
        await connection.execute('UPDATE `User` SET passwordHash = ? WHERE id = ?', [passwordHash, tokens[0].userId]);
        await connection.execute('UPDATE PasswordResetToken SET usedAt = NOW(3) WHERE id = ?', [tokens[0].id]);
        await connection.commit();
        return res.json({ message: 'Password berhasil diperbarui. Silakan login.' });
    }
    catch (error) {
        await connection.rollback();
        return next(error);
    }
    finally {
        connection.release();
    }
});
app.get('/api/v1/auth/me', requireAuth, async (req, res, next) => {
    try {
        const [users] = await db.execute('SELECT id, email, name, role, passwordHash, avatarUrl FROM `User` WHERE id = ?', [req.auth.sub]);
        if (!users[0])
            return res.status(401).json({ error: 'UNAUTHORIZED' });
        return res.json({ user: publicUser(users[0]) });
    }
    catch (error) {
        return next(error);
    }
});
app.use('/api/v1', requireAuth);
// Staff account management. Public registration always creates USER accounts;
// only an ADMIN can create or manage privileged accounts through these routes.
app.get('/api/v1/admin/staff', async (req, res, next) => {
    if (req.auth.role !== 'ADMIN')
        return res.status(403).json({ error: 'FORBIDDEN', message: 'Hanya Admin yang dapat mengelola akun staf.' });
    try {
        const [staff] = await db.execute("SELECT id, name, email, role, createdAt FROM `User` WHERE role IN ('ADMIN', 'NUTRITIONIST') ORDER BY createdAt DESC");
        return res.json({ staff });
    }
    catch (error) {
        return next(error);
    }
});
app.post('/api/v1/admin/staff', async (req, res, next) => {
    if (req.auth.role !== 'ADMIN')
        return res.status(403).json({ error: 'FORBIDDEN', message: 'Hanya Admin yang dapat membuat akun staf.' });
    const parsed = staffCreateSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Periksa kembali data akun staf.', details: parsed.error.flatten() });
    const connection = await db.getConnection();
    try {
        const id = (0, node_crypto_1.randomUUID)();
        const passwordHash = await hashPassword(parsed.data.password);
        await connection.beginTransaction();
        await connection.execute('INSERT INTO `User` (id, email, name, passwordHash, role) VALUES (?, ?, ?, ?, ?)', [id, parsed.data.email, parsed.data.name, passwordHash, parsed.data.role]);
        const goals = [
            ['CALORIES', 1800, 'kkal'], ['WATER', 2500, 'ml'], ['STEPS', 8000, 'langkah'],
            ['WEIGHT', 65, 'kg'], ['PROTEIN', 120, 'g'], ['CARBS', 220, 'g'], ['FAT', 60, 'g'],
        ];
        for (const [type, target, unit] of goals) {
            await connection.execute('INSERT INTO HealthGoal (id, userId, type, target, current, unit) VALUES (?, ?, ?, ?, 0, ?)', [(0, node_crypto_1.randomUUID)(), id, type, target, unit]);
        }
        await connection.commit();
        return res.status(201).json({ staff: { id, name: parsed.data.name, email: parsed.data.email, role: parsed.data.role } });
    }
    catch (error) {
        await connection.rollback();
        if (error.code === 'ER_DUP_ENTRY')
            return res.status(409).json({ error: 'EMAIL_EXISTS', message: 'Email sudah dipakai akun lain.' });
        return next(error);
    }
    finally {
        connection.release();
    }
});
app.put('/api/v1/admin/staff/:staffId', async (req, res, next) => {
    if (req.auth.role !== 'ADMIN')
        return res.status(403).json({ error: 'FORBIDDEN', message: 'Hanya Admin yang dapat mengubah akun staf.' });
    const parsed = staffUpdateSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Periksa kembali perubahan akun staf.', details: parsed.error.flatten() });
    try {
        const [staff] = await db.execute("SELECT id, email, name, role, passwordHash FROM `User` WHERE id = ? AND role IN ('ADMIN', 'NUTRITIONIST') LIMIT 1", [req.params.staffId]);
        const current = staff[0];
        if (!current)
            return res.status(404).json({ error: 'STAFF_NOT_FOUND', message: 'Akun staf tidak ditemukan.' });
        if (current.id === req.auth.sub && parsed.data.role && parsed.data.role !== 'ADMIN') {
            return res.status(400).json({ error: 'CANNOT_CHANGE_OWN_ROLE', message: 'Admin tidak dapat menurunkan role akunnya sendiri.' });
        }
        if (current.role === 'ADMIN' && parsed.data.role === 'NUTRITIONIST') {
            const [counts] = await db.execute("SELECT COUNT(*) AS total FROM `User` WHERE role = 'ADMIN'");
            if (counts[0].total <= 1)
                return res.status(400).json({ error: 'LAST_ADMIN', message: 'Minimal satu akun Admin harus tetap tersedia.' });
        }
        const fields = [];
        const values = [];
        if (parsed.data.name !== undefined) {
            fields.push('name = ?');
            values.push(parsed.data.name);
        }
        if (parsed.data.email !== undefined) {
            fields.push('email = ?');
            values.push(parsed.data.email);
        }
        if (parsed.data.role !== undefined) {
            fields.push('role = ?');
            values.push(parsed.data.role);
        }
        if (parsed.data.password !== undefined) {
            fields.push('passwordHash = ?');
            values.push(await hashPassword(parsed.data.password));
        }
        values.push(current.id);
        await db.execute(`UPDATE \`User\` SET ${fields.join(', ')} WHERE id = ?`, values);
        const [updated] = await db.execute('SELECT id, email, name, role, passwordHash FROM `User` WHERE id = ?', [current.id]);
        return res.json({ staff: publicUser(updated[0]) });
    }
    catch (error) {
        if (error.code === 'ER_DUP_ENTRY')
            return res.status(409).json({ error: 'EMAIL_EXISTS', message: 'Email sudah dipakai akun lain.' });
        return next(error);
    }
});
app.delete('/api/v1/admin/staff/:staffId', async (req, res, next) => {
    if (req.auth.role !== 'ADMIN')
        return res.status(403).json({ error: 'FORBIDDEN', message: 'Hanya Admin yang dapat menghapus akun staf.' });
    if (req.params.staffId === req.auth.sub)
        return res.status(400).json({ error: 'CANNOT_DELETE_SELF', message: 'Admin tidak dapat menghapus akunnya sendiri.' });
    try {
        const [staff] = await db.execute("SELECT id, email, name, role, passwordHash FROM `User` WHERE id = ? AND role IN ('ADMIN', 'NUTRITIONIST') LIMIT 1", [req.params.staffId]);
        const target = staff[0];
        if (!target)
            return res.status(404).json({ error: 'STAFF_NOT_FOUND', message: 'Akun staf tidak ditemukan.' });
        if (target.role === 'ADMIN') {
            const [counts] = await db.execute("SELECT COUNT(*) AS total FROM `User` WHERE role = 'ADMIN'");
            if (counts[0].total <= 1)
                return res.status(400).json({ error: 'LAST_ADMIN', message: 'Admin terakhir tidak dapat dihapus.' });
        }
        await db.execute('DELETE FROM `User` WHERE id = ?', [target.id]);
        return res.status(204).send();
    }
    catch (error) {
        return next(error);
    }
});
// Upload endpoint: expects JSON { fileName, data } where data is data:<mime>;base64,<data>
app.post('/api/v1/uploads', async (req, res, next) => {
    if (!['ADMIN', 'NUTRITIONIST'].includes(req.auth.role))
        return res.status(403).json({ error: 'FORBIDDEN' });
    try {
        const { fileName, data } = req.body;
        if (!data || typeof data !== 'string')
            return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Missing file data' });
        const match = data.match(/^data:(.+);base64,(.*)$/);
        if (!match)
            return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid data URL' });
        const mime = match[1];
        const base64 = match[2];
        const imageExtensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
        const ext = imageExtensions[mime];
        if (!ext)
            return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Format gambar tidak didukung.' });
        const buffer = Buffer.from(base64, 'base64');
        if (buffer.length > 5 * 1024 * 1024)
            return res.status(413).json({ error: 'FILE_TOO_LARGE', message: 'Ukuran gambar maksimal 5 MB.' });
        const safeName = (fileName ?? 'gambar').replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]/gi, '-').slice(0, 80) || 'gambar';
        const filename = `${(0, node_crypto_1.randomUUID)()}-${safeName}.${ext}`;
        await (0, promises_1.writeFile)(`${uploadDir}/${filename}`, buffer);
        const url = `${serverUrl}/${uploadDir}/${filename}`;
        return res.status(201).json({ url, filename });
    }
    catch (error) {
        return next(error);
    }
});
app.get('/api/v1/users/:userId', async (req, res, next) => {
    if (req.params.userId !== req.auth.sub)
        return res.status(403).json({ error: 'FORBIDDEN' });
    try {
        const [users] = await db.execute('SELECT id, email, name, role, passwordHash, avatarUrl FROM `User` WHERE id = ?', [req.auth.sub]);
        if (!users[0])
            return res.status(404).json({ error: 'USER_NOT_FOUND' });
        return res.json(publicUser(users[0]));
    }
    catch (error) {
        return next(error);
    }
});
app.patch('/api/v1/users/:userId', async (req, res, next) => {
    if (req.params.userId !== req.auth.sub)
        return res.status(403).json({ error: 'FORBIDDEN' });
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Nama atau email tidak valid.' });
    try {
        await db.execute('UPDATE `User` SET name = ?, email = ? WHERE id = ?', [parsed.data.name, parsed.data.email, req.auth.sub]);
        const [users] = await db.execute('SELECT id, email, name, role, passwordHash, avatarUrl FROM `User` WHERE id = ?', [req.auth.sub]);
        return res.json({ user: publicUser(users[0]) });
    }
    catch (error) {
        if (error.code === 'ER_DUP_ENTRY')
            return res.status(409).json({ error: 'EMAIL_EXISTS', message: 'Email sudah dipakai akun lain.' });
        return next(error);
    }
});
app.post('/api/v1/users/:userId/avatar', async (req, res, next) => {
    if (req.params.userId !== req.auth.sub)
        return res.status(403).json({ error: 'FORBIDDEN' });
    try {
        const { fileName, data } = req.body;
        const match = typeof data === 'string' ? data.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/) : null;
        if (!match)
            return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Gunakan foto JPG, PNG, atau WebP.' });
        const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
        const buffer = Buffer.from(match[2], 'base64');
        if (!buffer.length || buffer.length > 2 * 1024 * 1024)
            return res.status(413).json({ error: 'FILE_TOO_LARGE', message: 'Ukuran foto maksimal 2 MB.' });
        const safeName = (fileName ?? 'foto-profil').replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]/gi, '-').slice(0, 60) || 'foto-profil';
        const filename = `${(0, node_crypto_1.randomUUID)()}-${safeName}.${extensions[match[1]]}`;
        await (0, promises_1.mkdir)(uploadDir, { recursive: true });
        await (0, promises_1.writeFile)(`${uploadDir}/${filename}`, buffer);
        const avatarUrl = `${serverUrl}/${uploadDir}/${filename}`;
        await db.execute('UPDATE `User` SET avatarUrl = ? WHERE id = ?', [avatarUrl, req.auth.sub]);
        const [users] = await db.execute('SELECT id, email, name, role, passwordHash, avatarUrl FROM `User` WHERE id = ?', [req.auth.sub]);
        return res.json({ user: publicUser(users[0]) });
    }
    catch (error) {
        return next(error);
    }
});
app.put('/api/v1/users/:userId/password', async (req, res, next) => {
    if (req.params.userId !== req.auth.sub)
        return res.status(403).json({ error: 'FORBIDDEN' });
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Password baru tidak valid.' });
    try {
        const [users] = await db.execute('SELECT id, email, name, role, passwordHash, avatarUrl FROM `User` WHERE id = ? LIMIT 1', [req.auth.sub]);
        const user = users[0];
        if (!user?.passwordHash || !(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
            return res.status(400).json({ error: 'INVALID_CURRENT_PASSWORD', message: 'Password saat ini tidak sesuai.' });
        }
        const passwordHash = await hashPassword(parsed.data.newPassword);
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            await connection.execute('UPDATE `User` SET passwordHash = ? WHERE id = ?', [passwordHash, req.auth.sub]);
            await connection.execute('DELETE FROM PasswordResetToken WHERE userId = ?', [req.auth.sub]);
            await connection.commit();
        }
        catch (error) {
            await connection.rollback();
            throw error;
        }
        finally {
            connection.release();
        }
        return res.json({ message: 'Password berhasil diperbarui.' });
    }
    catch (error) {
        return next(error);
    }
});
app.put('/api/v1/goals', async (req, res, next) => {
    const parsed = goalsSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Nilai target tidak valid.' });
    const units = { CALORIES: 'kkal', WATER: 'ml', STEPS: 'langkah', WEIGHT: 'kg', PROTEIN: 'g', CARBS: 'g', FAT: 'g' };
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        for (const [type, target] of Object.entries(parsed.data.goals)) {
            await connection.execute('INSERT INTO HealthGoal (id, userId, type, target, current, unit) VALUES (?, ?, ?, ?, 0, ?) ON DUPLICATE KEY UPDATE target = VALUES(target), unit = VALUES(unit)', [(0, node_crypto_1.randomUUID)(), req.auth.sub, type, target, units[type]]);
        }
        await connection.commit();
        return res.json({ message: 'Target berhasil diperbarui.' });
    }
    catch (error) {
        await connection.rollback();
        return next(error);
    }
    finally {
        connection.release();
    }
});
app.get('/api/v1/dashboard/:userId', async (req, res, next) => {
    if (req.params.userId !== req.auth.sub)
        return res.status(403).json({ error: 'FORBIDDEN' });
    const userId = req.auth.sub;
    try {
        const [users] = await db.execute('SELECT id, email, name, role, passwordHash, avatarUrl FROM `User` WHERE id = ?', [userId]);
        if (!users[0])
            return res.status(404).json({ error: 'USER_NOT_FOUND' });
        const [[meals], [nutrition], [water], [activities], [goals], [weights], [weeklyActivity]] = await Promise.all([
            db.execute('SELECT id, userId, mealType, name, calories, protein, carbs, fat, loggedAt FROM MealLog WHERE userId = ? AND DATE(loggedAt) = CURDATE() ORDER BY loggedAt DESC', [userId]),
            db.execute('SELECT COALESCE(SUM(calories), 0) calories, COALESCE(SUM(protein), 0) protein, COALESCE(SUM(carbs), 0) carbs, COALESCE(SUM(fat), 0) fat FROM MealLog WHERE userId = ? AND DATE(loggedAt) = CURDATE()', [userId]),
            db.execute('SELECT COALESCE(SUM(amountMl), 0) total FROM WaterLog WHERE userId = ? AND DATE(loggedAt) = CURDATE()', [userId]),
            db.execute('SELECT COALESCE(SUM(steps), 0) total FROM ActivityLog WHERE userId = ? AND DATE(loggedAt) = CURDATE()', [userId]),
            db.execute('SELECT type, target, unit FROM HealthGoal WHERE userId = ?', [userId]),
            db.execute('SELECT weight, loggedAt FROM WeightLog WHERE userId = ? ORDER BY loggedAt DESC LIMIT 2', [userId]),
            db.execute(`SELECT DATE_FORMAT(DATE(loggedAt), '%Y-%m-%d') day, SUM(steps) steps FROM ActivityLog WHERE userId = ? AND loggedAt >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY DATE(loggedAt) ORDER BY DATE(loggedAt)`, [userId]),
        ]);
        const goalMap = Object.fromEntries(goals.map(goal => [goal.type, { target: goal.target, unit: goal.unit }]));
        const currentWeight = weights[0]?.weight ?? 0;
        const previousWeight = weights[1]?.weight ?? currentWeight;
        return res.json({
            user: publicUser(users[0]), date: new Date().toISOString(), nutrition: nutrition[0],
            calories: { consumed: nutrition[0].calories, target: goalMap.CALORIES?.target ?? 1800 },
            water: { consumedMl: water[0].total, targetMl: goalMap.WATER?.target ?? 2500 },
            steps: { current: activities[0].total, target: goalMap.STEPS?.target ?? 8000 },
            weight: { current: currentWeight, change: Number((currentWeight - previousWeight).toFixed(1)), target: goalMap.WEIGHT?.target ?? 65 },
            macroTargets: { protein: goalMap.PROTEIN?.target ?? 120, carbs: goalMap.CARBS?.target ?? 220, fat: goalMap.FAT?.target ?? 60 },
            meals, weeklyActivity,
        });
    }
    catch (error) {
        return next(error);
    }
});
app.get('/api/v1/recipes', async (req, res, next) => {
    const parsed = recipeQuerySchema.safeParse(req.query);
    if (!parsed.success)
        return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Masukkan minimal 2 karakter untuk mencari resep.' });
    try {
        const search = `%${parsed.data.q}%`;
        const [recipes] = await db.execute(`SELECT id, title, category, ingredients, steps, totalIngredients, totalSteps
       FROM Recipe
       WHERE titleCleaned LIKE ? OR title LIKE ?
       ORDER BY CASE WHEN titleCleaned LIKE ? THEN 0 ELSE 1 END, loves DESC, title ASC
       LIMIT ?`, [search, search, `${parsed.data.q}%`, parsed.data.limit]);
        return res.json({ recipes });
    }
    catch (error) {
        return next(error);
    }
});
app.get('/api/v1/nutrition-items', async (req, res, next) => {
    const parsed = nutritionItemQuerySchema.safeParse(req.query);
    if (!parsed.success)
        return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Masukkan minimal 2 karakter untuk mencari makanan atau minuman.' });
    try {
        const search = `%${parsed.data.q}%`;
        const prefix = `${parsed.data.q}%`;
        const [items] = await db.execute(`SELECT id, name, brand, kind, calories, protein, carbs, fat, fiber, sugar, sodium
       FROM NutritionItem
       WHERE nameNormalized LIKE ? OR name LIKE ? OR brand LIKE ?
       ORDER BY CASE WHEN nameNormalized LIKE ? OR name LIKE ? THEN 0 ELSE 1 END, name ASC
       LIMIT ?`, [search, search, search, prefix, prefix, parsed.data.limit]);
        return res.json({ items });
    }
    catch (error) {
        return next(error);
    }
});
app.post('/api/v1/meals', async (req, res, next) => {
    const parsed = mealSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    try {
        const id = (0, node_crypto_1.randomUUID)();
        const { mealType, name, calories, protein, carbs, fat } = parsed.data;
        await db.execute('INSERT INTO MealLog (id, userId, mealType, name, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [id, req.auth.sub, mealType, name, calories, protein, carbs, fat]);
        const [meals] = await db.execute('SELECT id, userId, mealType, name, calories, protein, carbs, fat, loggedAt FROM MealLog WHERE id = ?', [id]);
        return res.status(201).json(meals[0]);
    }
    catch (error) {
        return next(error);
    }
});
app.put('/api/v1/meals/:mealId', async (req, res, next) => {
    const parsed = mealSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    try {
        const { mealType, name, calories, protein, carbs, fat } = parsed.data;
        const [result] = await db.execute('UPDATE MealLog SET mealType = ?, name = ?, calories = ?, protein = ?, carbs = ?, fat = ? WHERE id = ? AND userId = ?', [mealType, name, calories, protein, carbs, fat, req.params.mealId, req.auth.sub]);
        if (result.affectedRows === 0)
            return res.status(404).json({ error: 'MEAL_NOT_FOUND', message: 'Catatan makanan tidak ditemukan.' });
        const [meals] = await db.execute('SELECT id, userId, mealType, name, calories, protein, carbs, fat, loggedAt FROM MealLog WHERE id = ? AND userId = ?', [req.params.mealId, req.auth.sub]);
        return res.json(meals[0]);
    }
    catch (error) {
        return next(error);
    }
});
app.delete('/api/v1/meals/:mealId', async (req, res, next) => {
    try {
        const [result] = await db.execute('DELETE FROM MealLog WHERE id = ? AND userId = ?', [req.params.mealId, req.auth.sub]);
        if (result.affectedRows === 0)
            return res.status(404).json({ error: 'MEAL_NOT_FOUND', message: 'Catatan makanan tidak ditemukan.' });
        return res.status(204).send();
    }
    catch (error) {
        return next(error);
    }
});
app.post('/api/v1/water', async (req, res, next) => {
    const parsed = waterSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    try {
        const id = (0, node_crypto_1.randomUUID)();
        await db.execute('INSERT INTO WaterLog (id, userId, amountMl) VALUES (?, ?, ?)', [id, req.auth.sub, parsed.data.amountMl]);
        return res.status(201).json({ id, userId: req.auth.sub, ...parsed.data });
    }
    catch (error) {
        return next(error);
    }
});
app.post('/api/v1/activities', async (req, res, next) => {
    const parsed = activitySchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    try {
        const id = (0, node_crypto_1.randomUUID)();
        const { steps, duration, calories, activityType } = parsed.data;
        await db.execute('INSERT INTO ActivityLog (id, userId, steps, duration, calories, activityType) VALUES (?, ?, ?, ?, ?, ?)', [id, req.auth.sub, steps, duration, calories, activityType]);
        return res.status(201).json({ id, userId: req.auth.sub, ...parsed.data });
    }
    catch (error) {
        return next(error);
    }
});
app.post('/api/v1/weights', async (req, res, next) => {
    const parsed = weightSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    try {
        const id = (0, node_crypto_1.randomUUID)();
        await db.execute('INSERT INTO WeightLog (id, userId, weight) VALUES (?, ?, ?)', [id, req.auth.sub, parsed.data.weight]);
        return res.status(201).json({ id, userId: req.auth.sub, ...parsed.data });
    }
    catch (error) {
        return next(error);
    }
});
// Article management (protected — only NUTRITIONIST or ADMIN)
const articleSchema = zod_1.z.object({ title: zod_1.z.string().trim().min(2).max(255), slug: zod_1.z.string().trim().min(1).max(191).optional(), category: zod_1.z.string().trim().max(100).optional(), excerpt: zod_1.z.string().trim().max(512).optional(), content: zod_1.z.string().min(1), imageUrl: zod_1.z.string().trim().url().max(1024).optional(), timeToRead: zod_1.z.string().trim().max(32).optional(), isNews: zod_1.z.boolean().optional() });
function slugify(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
app.post('/api/v1/articles', async (req, res, next) => {
    if (!['ADMIN', 'NUTRITIONIST'].includes(req.auth.role))
        return res.status(403).json({ error: 'FORBIDDEN' });
    const parsed = articleSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    try {
        const payload = parsed.data;
        const slug = payload.slug ? payload.slug : slugify(payload.title);
        const [existing] = await db.execute('SELECT id FROM Article WHERE slug = ? LIMIT 1', [slug]);
        if (existing[0])
            return res.status(409).json({ error: 'SLUG_EXISTS' });
        const id = (0, node_crypto_1.randomUUID)();
        await db.execute('INSERT INTO Article (id, slug, title, category, excerpt, content, imageUrl, timeToRead, isNews) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, slug, payload.title, payload.category ?? null, payload.excerpt ?? null, payload.content, payload.imageUrl ?? null, payload.timeToRead ?? null, payload.isNews ? 1 : 0]);
        return res.status(201).json({ id, slug, title: payload.title });
    }
    catch (error) {
        return next(error);
    }
});
app.put('/api/v1/articles/:slug', async (req, res, next) => {
    if (!['ADMIN', 'NUTRITIONIST'].includes(req.auth.role))
        return res.status(403).json({ error: 'FORBIDDEN' });
    const parsed = articleSchema.partial().safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    try {
        const currentSlug = req.params.slug;
        const [rows] = await db.execute('SELECT id FROM Article WHERE slug = ? LIMIT 1', [currentSlug]);
        const row = rows[0];
        if (!row)
            return res.status(404).json({ error: 'NOT_FOUND' });
        const updates = parsed.data;
        if (updates.slug) {
            const newSlug = updates.slug;
            const [conflict] = await db.execute('SELECT id FROM Article WHERE slug = ? AND slug != ? LIMIT 1', [newSlug, currentSlug]);
            if (conflict[0])
                return res.status(409).json({ error: 'SLUG_EXISTS' });
        }
        const fields = [];
        const values = [];
        for (const key of Object.keys(updates)) {
            // allow only these fields
            if (['title', 'slug', 'category', 'excerpt', 'content', 'imageUrl', 'timeToRead', 'isNews'].includes(key)) {
                fields.push(`${key} = ?`);
                values.push(updates[key]);
            }
        }
        if (fields.length === 0)
            return res.status(400).json({ error: 'NO_UPDATES' });
        values.push(currentSlug);
        await db.execute(`UPDATE Article SET ${fields.join(', ')} WHERE slug = ?`, values);
        return res.json({ message: 'UPDATED' });
    }
    catch (error) {
        return next(error);
    }
});
app.delete('/api/v1/articles/:slug', async (req, res, next) => {
    if (!['ADMIN', 'NUTRITIONIST'].includes(req.auth.role))
        return res.status(403).json({ error: 'FORBIDDEN' });
    try {
        const slug = req.params.slug;
        const [result] = await db.execute('DELETE FROM Article WHERE slug = ?', [slug]);
        if (result.affectedRows === 0)
            return res.status(404).json({ error: 'NOT_FOUND' });
        return res.status(204).send();
    }
    catch (error) {
        return next(error);
    }
});
const notificationSchema = zod_1.z.object({ title: zod_1.z.string().trim().min(1).max(255), message: zod_1.z.string().trim().min(1), imageUrl: zod_1.z.string().trim().url().optional() });
app.get('/api/v1/notifications', async (req, res, next) => {
    try {
        const [rows] = await db.execute('SELECT id, title, message, imageUrl, createdAt FROM Notification ORDER BY createdAt DESC LIMIT 50');
        const notifications = rows.map(r => ({ id: r.id, title: r.title, message: r.message, imageUrl: r.imageUrl ?? null, createdAt: r.createdAt }));
        return res.json({ notifications });
    }
    catch (error) {
        return next(error);
    }
});
app.get('/api/v1/notifications/:id', async (req, res, next) => {
    try {
        const [rows] = await db.execute('SELECT id, title, message, imageUrl, createdAt FROM Notification WHERE id = ? LIMIT 1', [req.params.id]);
        const row = rows[0];
        if (!row)
            return res.status(404).json({ error: 'NOT_FOUND' });
        return res.json({ id: row.id, title: row.title, message: row.message, imageUrl: row.imageUrl ?? null, createdAt: row.createdAt });
    }
    catch (error) {
        return next(error);
    }
});
app.post('/api/v1/notifications', async (req, res, next) => {
    if (!['ADMIN', 'NUTRITIONIST'].includes(req.auth.role))
        return res.status(403).json({ error: 'FORBIDDEN' });
    const parsed = notificationSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    try {
        const id = (0, node_crypto_1.randomUUID)();
        await db.execute('INSERT INTO Notification (id, title, message, imageUrl) VALUES (?, ?, ?, ?)', [id, parsed.data.title, parsed.data.message, parsed.data.imageUrl ?? null]);
        return res.status(201).json({ id });
    }
    catch (error) {
        return next(error);
    }
});
app.put('/api/v1/notifications/:id', async (req, res, next) => {
    if (!['ADMIN', 'NUTRITIONIST'].includes(req.auth.role))
        return res.status(403).json({ error: 'FORBIDDEN' });
    const parsed = notificationSchema.partial().safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    try {
        const fields = [];
        const values = [];
        for (const key of Object.keys(parsed.data)) {
            if (['title', 'message', 'imageUrl'].includes(key)) {
                fields.push(`${key} = ?`);
                values.push(parsed.data[key]);
            }
        }
        if (fields.length === 0)
            return res.status(400).json({ error: 'NO_UPDATES' });
        values.push(req.params.id);
        await db.execute(`UPDATE Notification SET ${fields.join(', ')} WHERE id = ?`, values);
        return res.json({ message: 'UPDATED' });
    }
    catch (error) {
        return next(error);
    }
});
app.delete('/api/v1/notifications/:id', async (req, res, next) => {
    if (!['ADMIN', 'NUTRITIONIST'].includes(req.auth.role))
        return res.status(403).json({ error: 'FORBIDDEN' });
    try {
        const [result] = await db.execute('DELETE FROM Notification WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0)
            return res.status(404).json({ error: 'NOT_FOUND' });
        return res.status(204).send();
    }
    catch (error) {
        return next(error);
    }
});
app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));
app.use((error, _req, res, _next) => {
    console.error(error);
    const code = error.code;
    if (code === 'ER_NO_REFERENCED_ROW_2')
        return res.status(404).json({ error: 'USER_NOT_FOUND' });
    if (['ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'ECONNREFUSED', 'POOL_NONEONLINE'].includes(code ?? '')) {
        return res.status(503).json({ error: 'DATABASE_UNAVAILABLE', message: databaseErrorMessage(error) });
    }
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'Terjadi kesalahan pada server.' });
});
async function showStartupInfo() {
    let databaseStatus = 'tidak terhubung';
    let databaseError = '';
    let uploadsStatus = `siap (${uploadDir})`;
    try {
        await db.query('SELECT 1');
        databaseStatus = 'terhubung';
    }
    catch (error) {
        databaseError = databaseErrorMessage(error);
    }
    try {
        await (0, promises_1.mkdir)(uploadDir, { recursive: true });
    }
    catch (error) {
        uploadsStatus = `gagal disiapkan (${error instanceof Error ? error.message : 'kesalahan tidak diketahui'})`;
    }
    // Keep content tables available for existing database volumes as well.
    try {
        const [avatarColumns] = await db.execute(`SELECT 1
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'User' AND COLUMN_NAME = 'avatarUrl'
       LIMIT 1`, [dbName]);
        if (!avatarColumns[0]) {
            await db.execute('ALTER TABLE `User` ADD COLUMN avatarUrl VARCHAR(1024) NULL AFTER passwordHash');
        }
        await db.execute(`
      CREATE TABLE IF NOT EXISTS Article (
        id VARCHAR(36) NOT NULL,
        slug VARCHAR(191) NOT NULL,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) NULL,
        excerpt VARCHAR(512) NULL,
        content LONGTEXT NOT NULL,
        imageUrl VARCHAR(1024) NULL,
        timeToRead VARCHAR(32) NULL,
        isNews TINYINT(1) NOT NULL DEFAULT 0,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        UNIQUE KEY Article_slug_key (slug),
        KEY Article_createdAt_idx (createdAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
        const [imageUrlColumns] = await db.execute(`SELECT 1
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Article' AND COLUMN_NAME = 'imageUrl'
       LIMIT 1`, [dbName]);
        if (!imageUrlColumns[0]) {
            await db.execute('ALTER TABLE Article ADD COLUMN imageUrl VARCHAR(1024) NULL AFTER content');
        }
        await db.execute(`
      CREATE TABLE IF NOT EXISTS Notification (
        id VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        imageUrl VARCHAR(1024) NULL,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        KEY Notification_createdAt_idx (createdAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    }
    catch (err) {
        console.warn('Gagal memastikan tabel konten:', err);
    }
    const databaseRoute = `${dbUser}@${dbHost}:${dbPort}/${dbName} → ${dbFallbackUser}@${dbFallbackHost}:${dbFallbackPort}/${dbFallbackName} (Docker)`;
    console.log(['', 'NutriLife API siap', `🖥️  server    ${serverUrl}`, `🗄️  database  ${databaseRoute} (${databaseStatus})`, `🔐  auth      JWT 7 hari`, `🩺  health    ${serverUrl}/health`, `📦  uploads   ${uploadsStatus}`, ''].join('\n'));
    if (!process.env.JWT_SECRET)
        console.warn('⚠️  auth      JWT_SECRET belum diatur; memakai secret development');
    if (databaseError)
        console.warn(`⚠️  database  ${databaseError}`);
}
app.listen(port, () => { void showStartupInfo(); });
