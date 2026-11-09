import { projectRoot } from '../config/environment.js'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import mysql from 'mysql2/promise'
import { databaseConfig } from '../config/environment.js'

const expectedHeaders = [
  'Title', 'Ingredients', 'Steps', 'Loves', 'URL', 'Category',
  'Title Cleaned', 'Total Ingredients', 'Ingredients Cleaned', 'Total Steps',
]

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

function asNonNegativeInteger(value: string) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

async function main() {
  const cliPath = process.argv.slice(2).find(argument => !argument.startsWith('--'))
  const dryRun = process.argv.includes('--dry-run')
  const csvPath = resolve(projectRoot, cliPath ?? process.env.RECIPE_CSV_PATH ?? '../Indonesian_Food_Recipes.csv')
  const csv = await readFile(csvPath, 'utf8')
  const [headers, ...rows] = parseCsv(csv.replace(/^\uFEFF/, ''))
  if (!headers || expectedHeaders.some((header, index) => headers[index] !== header)) {
    throw new Error(`Header CSV tidak sesuai. Diharapkan: ${expectedHeaders.join(', ')}`)
  }

  const recipes = rows.filter(row => row.length >= expectedHeaders.length && row[0].trim() && row[4].trim()).map(row => {
    const sourceUrl = row[4].trim()
    return [
      createHash('sha256').update(sourceUrl).digest('hex'), row[0].trim(), row[1].trim(), row[2].trim(),
      asNonNegativeInteger(row[3]), sourceUrl, row[5].trim(), row[6].trim() || row[0].trim().toLowerCase(),
      asNonNegativeInteger(row[7]), row[8].trim(), asNonNegativeInteger(row[9]),
    ]
  })

  if (dryRun) {
    console.log(`CSV valid: ${recipes.length} resep siap diimpor dari ${csvPath}`)
    return
  }

  const db = await mysql.createConnection({ ...databaseConfig, charset: 'utf8mb4' })

  try {
    await db.query(`CREATE TABLE IF NOT EXISTS Recipe (
      id CHAR(64) NOT NULL,
      title VARCHAR(255) NOT NULL,
      ingredients LONGTEXT NOT NULL,
      steps LONGTEXT NOT NULL,
      loves INT UNSIGNED NOT NULL DEFAULT 0,
      sourceUrl VARCHAR(768) NOT NULL,
      category VARCHAR(100) NOT NULL,
      titleCleaned VARCHAR(255) NOT NULL,
      totalIngredients INT UNSIGNED NOT NULL DEFAULT 0,
      ingredientsCleaned LONGTEXT NOT NULL,
      totalSteps INT UNSIGNED NOT NULL DEFAULT 0,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY Recipe_sourceUrl_key (sourceUrl),
      KEY Recipe_titleCleaned_idx (titleCleaned),
      KEY Recipe_category_idx (category)
    ) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
    const batchSize = 250
    for (let offset = 0; offset < recipes.length; offset += batchSize) {
      const batch = recipes.slice(offset, offset + batchSize)
      const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')
      await db.query(
        `INSERT INTO Recipe (id, title, ingredients, steps, loves, sourceUrl, category, titleCleaned, totalIngredients, ingredientsCleaned, totalSteps)
         VALUES ${placeholders}
         ON DUPLICATE KEY UPDATE title = VALUES(title), ingredients = VALUES(ingredients), steps = VALUES(steps),
         loves = VALUES(loves), category = VALUES(category), titleCleaned = VALUES(titleCleaned),
         totalIngredients = VALUES(totalIngredients), ingredientsCleaned = VALUES(ingredientsCleaned), totalSteps = VALUES(totalSteps)`,
        batch.flat(),
      )
      process.stdout.write(`\rMengimpor resep: ${Math.min(offset + batchSize, recipes.length)}/${recipes.length}`)
    }
    process.stdout.write(`\nSelesai. ${recipes.length} resep tersedia di NutriLife.\n`)
  } finally { await db.end() }
}

main().catch(error => {
  console.error('\nImport resep gagal:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
