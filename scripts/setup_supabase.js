const fs = require('node:fs')
const path = require('node:path')
const dns = require('node:dns').promises
const { Client } = require('pg')

function readEnvValue(name) {
  const file = fs.readFileSync(path.resolve(__dirname, '../../.env'), 'utf8')
  const line = file.split(/\r?\n/).find((entry) => entry.startsWith(`${name}=`))
  if (!line) throw new Error(`${name} is missing from workspace .env`)
  return line.slice(name.length + 1).trim().replace(/^['"]|['"]$/g, '')
}

async function main() {
  const connectionString = readEnvValue('SUPABASE_DATABASE_URL')
  const sqlPath = path.resolve(__dirname, '../supabase/migrations/001_initial_schema.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')
  const parsed = new URL(connectionString)
  const ipv4 = await dns.lookup(parsed.hostname, { family: 4 })
  const client = new Client({
    host: ipv4.address,
    port: Number(parsed.port || 5432),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.slice(1) || 'postgres',
    ssl: { rejectUnauthorized: false },
  })

  await client.connect()
  try {
    await client.query(sql)
    const result = await client.query(`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name in ('branches', 'app_users', 'customers', 'orders', 'app_settings')
      order by table_name
    `)
    console.log(`Supabase schema ready: ${result.rows.map((row) => row.table_name).join(', ')}`)
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(`Supabase schema setup failed: ${error.message}`)
  process.exitCode = 1
})
