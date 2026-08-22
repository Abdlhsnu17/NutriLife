import 'dotenv/config'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import mysql from 'mysql2/promise'

const requiredHeaders = ['restaurant', 'item', 'calories', 'total_fat', 'total_carb', 'protein'] as const

function parseCsv(input: string) {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index]
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') { field += '"'; index += 1 }
      else if (character === '"') quoted = false
      else field += character
    } else if (character === '"') quoted = true
    else if (character === ',') { row.push(field); field = '' }
    else if (character === '\n') {
      row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''
    } else field += character
  }

  if (field || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row) }
  if (quoted) throw new Error('CSV tidak valid: tanda kutip penutup tidak ditemukan.')
  return rows
}

function asNonNegativeNumber(value: string | undefined) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function normalize(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

function itemKind(name: string): 'FOOD' | 'DRINK' {
  return /\b(coffee|cappuccino|latte|tea|juice|lemonade|soda|cola|sprite|fanta|shake|smoothie|milk|water|beverage|drink|chocolate)\b/i.test(name)
    ? 'DRINK'
    : 'FOOD'
}

async function main() {
  const csvPath = resolve(process.argv[2] ?? process.env.FASTFOOD_CSV_PATH ?? 'fastfood.csv')
  const csv = await readFile(csvPath, 'utf8')
  const [rawHeaders, ...rows] = parseCsv(csv.replace(/^\uFEFF/, ''))
  const headers = rawHeaders?.map(header => header.trim().toLowerCase()) ?? []
  const indexes = Object.fromEntries(headers.map((header, index) => [header, index]))
  const missingHeaders = requiredHeaders.filter(header => indexes[header] === undefined)
  if (missingHeaders.length) throw new Error(`Kolom CSV belum lengkap: ${missingHeaders.join(', ')}`)

  const value = (row: string[], header: string) => row[indexes[header]]?.trim() ?? ''
  const items = rows.filter(row => value(row, 'restaurant') && value(row, 'item')).map(row => {
    const brand = value(row, 'restaurant')
    const name = value(row, 'item')
    const identity = `${normalize(brand)}|${normalize(name)}`
    return [
      createHash('sha256').update(identity).digest('hex'), name, normalize(name), brand, itemKind(name),
      Math.round(asNonNegativeNumber(value(row, 'calories'))), asNonNegativeNumber(value(row, 'protein')),
      asNonNegativeNumber(value(row, 'total_carb')), asNonNegativeNumber(value(row, 'total_fat')),
      asNonNegativeNumber(value(row, 'fiber')), asNonNegativeNumber(value(row, 'sugar')),
      asNonNegativeNumber(value(row, 'sodium')), 'fastfood-nutrition',
    ]
  })

  const db = await mysql.createConnection({
    host: process.env.DB_HOST ?? 'localhost', port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'nutrilife', password: process.env.DB_PASSWORD ?? 'nutrilife',
    database: process.env.DB_NAME ?? 'nutrilife', charset: 'utf8mb4',
  })

  try {
    const batchSize = 250
    for (let offset = 0; offset < items.length; offset += batchSize) {
      const batch = items.slice(offset, offset + batchSize)
      const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')
      await db.query(
        `INSERT INTO NutritionItem
          (id, name, nameNormalized, brand, kind, calories, protein, carbs, fat, fiber, sugar, sodium, source)
         VALUES ${placeholders}
         ON DUPLICATE KEY UPDATE name = VALUES(name), nameNormalized = VALUES(nameNormalized), brand = VALUES(brand),
         kind = VALUES(kind), calories = VALUES(calories), protein = VALUES(protein), carbs = VALUES(carbs),
         fat = VALUES(fat), fiber = VALUES(fiber), sugar = VALUES(sugar), sodium = VALUES(sodium), source = VALUES(source)`,
        batch.flat(),
      )
      process.stdout.write(`\rMengimpor data nutrisi: ${Math.min(offset + batchSize, items.length)}/${items.length}`)
    }
    process.stdout.write(`\nSelesai. ${items.length} makanan/minuman tersedia untuk pengisian otomatis.\n`)
  } finally { await db.end() }
}

main().catch(error => {
  console.error('\nImport data nutrisi gagal:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
