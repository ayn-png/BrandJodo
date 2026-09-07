// Dev-only migration runner: applies ../migrations/*.sql (sorted) over a direct
// Postgres connection. Credentials come from env vars — nothing is hardcoded:
//   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
// Applied files are tracked in public.schema_migrations so re-runs are no-ops
// and only new migrations execute. Each file runs in its own transaction.
//
// Modes:
//   node migrate.mjs          apply pending migrations
//   node migrate.mjs --seed   additionally load ../seed.sql (idempotent demo data)
//
// After applying, it tries to schedule the escrow auto-release job on pg_cron
// (idempotent). Set SUPABASE_SKIP_CRON=1 to skip; a missing extension is a
// warning, not a failure.
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

  // Optional seed: run once after migrations exist on the target DB. The file is
  // written to be idempotent, so re-running is safe.
  if (process.argv.includes('--seed')) {
    const seedSql = await readFile(join(here, '..', 'seed.sql'), 'utf8')
    process.stdout.write('Applying seed.sql ... ')
    try {
      await client.query('begin')
      await client.query(seedSql)
      await client.query('commit')
      console.log('ok')
    } catch (err) {
      await client.query('rollback')
      console.log('FAILED')
      throw err
    }
  }

  // Best-effort scheduler wiring: pg_cron on hosted Supabase. Failure here (no
  // extension grants) must not fail the migration run — the Edge Function
  // fallback (supabase/functions/auto-release) covers that case.
  if (!process.env.SUPABASE_SKIP_CRON) {
    try {
      await client.query('create extension if not exists pg_cron')
      await client.query(`
        do $runner$
        begin
          if exists (select 1 from pg_extension where extname = 'pg_cron') then
            if exists (select 1 from cron.job where jobname = 'release-due-escrow') then
              perform cron.unschedule('release-due-escrow');
            end if;
            perform cron.schedule('release-due-escrow', '*/10 * * * *',
              $$select public.release_due_escrow()$$);
          end if;
        end $runner$;
      `)
      console.log('Scheduled release_due_escrow on pg_cron (every 10 minutes).')
    } catch (err) {
      console.warn(
        `\nSkipped pg_cron scheduling: ${err.message}\n` +
          '  Deploy supabase/functions/auto-release and schedule it instead, or set SUPABASE_SKIP_CRON=1.',
      )
    }
  }
}

run()
  .then(() => console.log('Done.'))
  .catch((err) => {
    console.error('\nMigration stopped:', err.message)
    process.exitCode = 1
  })
  .finally(() => client.end())
