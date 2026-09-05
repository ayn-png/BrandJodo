// Dev-only migration runner: applies ../migrations/*.sql (sorted) over a direct
// Postgres connection. Credentials come from env vars — nothing is hardcoded:
//   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
// Applied files are tracked in public.schema_migrations so re-runs are no-ops
// and only new migrations execute. Each file runs in its own transaction.
//
// BASELINE (optional): comma-separated filenames to record as already-applied
// WITHOUT executing them — used once to adopt migrations that predate this
// tracking table (0001-0003 were applied to the live DB before it existed).
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const here = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(here, '..', 'migrations')

const required = ['PGHOST', 'PGUSER', 'PGPASSWORD', 'PGDATABASE']
const missing = required.filter((k) => !process.env[k])
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(', ')}`)
  process.exit(1)
}

const baseline = (process.env.BASELINE ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const client = new pg.Client({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT ?? 5432),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: { rejectUnauthorized: false },
})

const run = async () => {
  await client.connect()
  const port = process.env.PGPORT ?? 5432
  console.log(`Connected to ${process.env.PGHOST}:${port}/${process.env.PGDATABASE}`)

  await client.query(`
    create table if not exists public.schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `)

  // Record baseline files as applied without executing them.
  for (const file of baseline) {
    const res = await client.query(
      'insert into public.schema_migrations (filename) values ($1) on conflict do nothing',
      [file],
    )
    if (res.rowCount) console.log(`Baselined ${file} (recorded, not executed)`)
  }

  const applied = new Set(
    (await client.query('select filename from public.schema_migrations')).rows.map((r) => r.filename),
  )

  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort()
  if (!files.length) {
    console.log('No .sql migrations found.')
    return
  }

  let ran = 0
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`Skipping ${file} (already applied)`)
      continue
    }
    const sql = await readFile(join(migrationsDir, file), 'utf8')
    process.stdout.write(`Applying ${file} ... `)
    try {
      await client.query('begin')
      await client.query(sql)
      await client.query('insert into public.schema_migrations (filename) values ($1)', [file])
      await client.query('commit')
      console.log('ok')
      ran++
    } catch (err) {
      await client.query('rollback')
      console.log('FAILED')
      throw err
    }
  }
  console.log(`\n${ran} new migration(s) applied.`)
}

run()
  .then(() => console.log('Done.'))
  .catch((err) => {
    console.error('\nMigration stopped:', err.message)
    process.exitCode = 1
  })
  .finally(() => client.end())
