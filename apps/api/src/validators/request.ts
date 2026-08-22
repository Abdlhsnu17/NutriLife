import { z } from 'zod'

const emailSchema = z.string().trim().email().max(191).transform(value => value.toLowerCase())
const passwordSchema = z.string().min(8).max(72).regex(/[A-Za-z]/, 'Password harus memiliki huruf').regex(/\d/, 'Password harus memiliki angka')

export const registerSchema = z.object({ name: z.string().trim().min(2).max(120), email: emailSchema, password: passwordSchema })
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(72) })
export const forgotSchema = z.object({ email: emailSchema })
export const resetSchema = z.object({ token: z.string().min(32).max(200), password: passwordSchema })
export const profileSchema = z.object({ name: z.string().trim().min(2).max(120), email: emailSchema })
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: passwordSchema,
}).refine(value => value.currentPassword !== value.newPassword, {
  message: 'Password baru harus berbeda dari password saat ini.', path: ['newPassword'],
})
export const staffRoleSchema = z.enum(['NUTRITIONIST', 'ADMIN'])
export const staffCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: emailSchema,
  password: passwordSchema,
  role: staffRoleSchema,
})
export const staffUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: emailSchema.optional(),
  password: passwordSchema.optional(),
  role: staffRoleSchema.optional(),
}).refine(value => Object.keys(value).length > 0, { message: 'Tidak ada perubahan.' })
export const goalsSchema = z.object({ goals: z.object({
  CALORIES: z.number().positive().max(20000), WATER: z.number().positive().max(20000),
  STEPS: z.number().positive().max(200000), WEIGHT: z.number().positive().max(500),
  PROTEIN: z.number().positive().max(1000), CARBS: z.number().positive().max(1000), FAT: z.number().positive().max(1000),
}) })
export const mealSchema = z.object({
  mealType: z.enum(['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER']), name: z.string().trim().min(2).max(120),
  calories: z.number().int().nonnegative().max(10000), protein: z.number().nonnegative().max(1000).default(0),
  carbs: z.number().nonnegative().max(1000).default(0), fat: z.number().nonnegative().max(1000).default(0),
})
export const waterSchema = z.object({ amountMl: z.number().int().positive().max(5000).default(250) })
export const activitySchema = z.object({ steps: z.number().int().nonnegative().max(200000), duration: z.number().int().nonnegative().max(1440).default(0), calories: z.number().int().nonnegative().max(10000).default(0), activityType: z.string().trim().min(2).max(120).default('Berjalan') })
export const weightSchema = z.object({ weight: z.number().positive().max(500) })
export const recipeQuerySchema = z.object({
  q: z.string().trim().min(2).max(80),
  limit: z.coerce.number().int().min(1).max(20).default(8),
})
export const nutritionItemQuerySchema = z.object({
  q: z.string().trim().min(2).max(80),
  limit: z.coerce.number().int().min(1).max(20).default(8),
})
