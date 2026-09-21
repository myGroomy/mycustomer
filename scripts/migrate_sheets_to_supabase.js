const fs = require('node:fs')
const path = require('node:path')
const dns = require('node:dns').promises
const { Client } = require('pg')
const { google } = require('googleapis')

function readEnvValue(name) {
  const files = [
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../.env.local'),
  ]
  for (const filePath of files) {
    if (!fs.existsSync(filePath)) continue
    const line = fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .find((entry) => entry.startsWith(`${name}=`))
    if (line) return line.slice(name.length + 1).trim().replace(/^['"]|['"]$/g, '')
  }
  throw new Error(`${name} is missing from workspace env files`)
}

function parseRows(values) {
  const headers = values[0] || []
  return values.slice(1).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] || ''])),
  )
}

function asBoolean(value) {
  return ['true', 'TRUE', '1', 'yes', 'YES'].includes(value)
}

function asJson(value, fallback = []) {
  if (!value) return fallback
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (digits.startsWith('62')) return `0${digits.slice(2)}`
  if (digits.startsWith('8')) return `0${digits}`
  return digits
}

function createGoogleSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: readEnvValue('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
      private_key: readEnvValue('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY').replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
  return google.sheets({ version: 'v4', auth })
}

async function readSheet(sheets, spreadsheetId, name) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${name}!A:Z`,
  })
  return parseRows(response.data.values || [])
}

async function insertBatch(client, table, columns, rows, conflictColumn = 'id') {
  if (rows.length === 0) return
  const values = []
  const placeholders = rows.map((row, rowIndex) => {
    const rowPlaceholders = columns.map((_, columnIndex) => {
      values.push(row[columnIndex])
      return `$${values.length}`
    })
    return `(${rowPlaceholders.join(', ')})`
  })
  await client.query(
    `insert into ${table} (${columns.join(', ')}) values ${placeholders.join(', ')}
     on conflict (${conflictColumn}) do update set ${columns.filter((column) => column !== conflictColumn).map((column) => `${column} = excluded.${column}`).join(', ')}`,
    values,
  )
}

async function insertRest(table, rows, conflictColumn = 'id') {
  if (rows.length === 0) return
  const url = `${readEnvValue('NEXT_PUBLIC_SUPABASE_URL')}/rest/v1/${table}`
  for (let index = 0; index < rows.length; index += 500) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: readEnvValue('SUPABASE_SERVICE_ROLE_KEY'),
        Authorization: `Bearer ${readEnvValue('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
        Prefer: `resolution=merge-duplicates,return=minimal`,
      },
      body: JSON.stringify(rows.slice(index, index + 500)),
    })
    if (!response.ok) {
      throw new Error(`REST insert ${table} failed (${response.status}): ${await response.text()}`)
    }
  }
}

async function migrateViaRest(data) {
  await insertRest('branches', data.branches)
  await insertRest('app_users', data.users)
  await insertRest('customers', data.customers)
  await insertRest('orders', data.orders)
  await insertRest('app_settings', data.settings, 'key')
  console.log('Supabase data migration completed via REST API')
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const sheets = createGoogleSheetsClient()
  const spreadsheetId = readEnvValue('GOOGLE_SPREADSHEET_ID') || readEnvValue('MYCUSTOMER_BACKUP_SHEET_ID')
  const [branchRows, userRows, customerRows, orderRows, settingsRows] = await Promise.all([
    readSheet(sheets, spreadsheetId, 'branches'),
    readSheet(sheets, spreadsheetId, 'users'),
    readSheet(sheets, spreadsheetId, 'customers'),
    readSheet(sheets, spreadsheetId, 'orders'),
    readSheet(sheets, spreadsheetId, 'settings'),
  ])

  const customerIdBySourceId = new Map()
  const customerByPhone = new Map()
  const customers = []
  for (const row of customerRows.filter((candidate) => candidate.id && candidate.phone_normalized && candidate.name)) {
    const phone = normalizePhone(row.phone_normalized)
    const existing = customerByPhone.get(phone)
    if (existing) {
      customerIdBySourceId.set(row.id, existing.id)
      continue
    }
    const customer = {
      id: row.id,
      phone_normalized: phone,
    name: row.name,
    first_order_date: row.first_order_date || new Date().toISOString().slice(0, 10),
    created_at: row.created_at || new Date().toISOString(),
    version: row.version || null,
    branch: row.branch || null,
    order_count: Number.parseInt(row.order_count || '0', 10) || 0,
    description: row.description || null,
    age_range: row.age_range || null,
    usia: row.usia || null,
    gender: row.gender || null,
    jenis_kelamin: row.jenis_kelamin || null,
    aliases: JSON.stringify(asJson(row.aliases)),
    branch_memberships: JSON.stringify(asJson(row.branch_memberships)),
    is_followed_up: asBoolean(row.is_followed_up),
    followed_up_at: row.followed_up_at || null,
    }
    customers.push(customer)
    customerByPhone.set(phone, customer)
    customerIdBySourceId.set(row.id, customer.id)
  }

  const customerIds = new Set(customers.map((customer) => customer.id))
  const orders = orderRows.filter((row) =>
    row.id &&
    row.customer_id &&
    row.order_date &&
    row.channel &&
    customerIds.has(customerIdBySourceId.get(row.customer_id) || row.customer_id),
  ).map((row) => ({
    id: row.id,
    customer_id: customerIdBySourceId.get(row.customer_id) || row.customer_id,
    order_date: row.order_date,
    channel: row.channel,
    raw_phone_input: row.raw_phone_input || null,
    created_at: row.created_at || new Date().toISOString(),
    branch: row.branch || null,
    is_followed_up: asBoolean(row.is_followed_up),
    followed_up_at: row.followed_up_at || null,
  }))

  console.log(JSON.stringify({
    dry_run: dryRun,
    branches: branchRows.length,
    users: userRows.length,
    customers: customers.length,
    orders: orders.length,
    settings: settingsRows.length,
  }))

  if (dryRun) return

  const parsed = new URL(readEnvValue('SUPABASE_DATABASE_URL'))
  const client = new Client({
    host: parsed.hostname,
    port: Number(parsed.port || 5432),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.slice(1) || 'postgres',
    ssl: { rejectUnauthorized: false },
  })
  try {
    await client.connect()
  } catch (error) {
    console.warn(`Direct PostgreSQL unavailable (${error.message}); using Supabase REST API`)
    await migrateViaRest({
      branches: branchRows.filter((row) => row.id && row.code).map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name || row.code,
        address: row.address || null,
        is_active: row.is_active !== 'FALSE',
        created_at: row.created_at || new Date().toISOString(),
      })),
      users: userRows.filter((row) => row.id && row.username && row.pin).map((row) => ({
        id: row.id,
        username: row.username,
        display_name: row.display_name || row.branch || row.username,
        pin: row.pin,
        role: ['owner', 'admin', 'kasir'].includes(row.role) ? row.role : 'kasir',
        branch: row.branch || null,
        active: row.active !== 'false' && row.status !== 'disabled',
        created_at: row.created_at || new Date().toISOString(),
      })),
      customers: customers.map((row) => ({
        ...row,
        aliases: JSON.parse(row.aliases),
        branch_memberships: JSON.parse(row.branch_memberships),
      })),
      orders,
      settings: settingsRows.filter((row) => row.key).map((row) => ({
        key: row.key,
        value: row.value || '',
      })),
    })
    return
  }
  try {
    await client.query('begin')
    await insertBatch(client, 'branches', ['id', 'code', 'name', 'address', 'is_active', 'created_at'], branchRows.filter((row) => row.id && row.code).map((row) => [
      row.id, row.code, row.name || row.code, row.address || null, row.is_active !== 'FALSE', row.created_at || new Date().toISOString(),
    ]))
    await insertBatch(client, 'app_users', ['id', 'username', 'display_name', 'pin', 'role', 'branch', 'active', 'created_at'], userRows.filter((row) => row.id && row.username && row.pin).map((row) => [
      row.id, row.username, row.display_name || row.branch || row.username, row.pin, ['owner', 'admin', 'kasir'].includes(row.role) ? row.role : 'kasir', row.branch || null, row.active !== 'false' && row.status !== 'disabled', row.created_at || new Date().toISOString(),
    ]))
    await insertBatch(client, 'customers', ['id', 'phone_normalized', 'name', 'first_order_date', 'created_at', 'version', 'branch', 'order_count', 'description', 'age_range', 'usia', 'gender', 'jenis_kelamin', 'aliases', 'branch_memberships', 'is_followed_up', 'followed_up_at'], customers.map((row) => [
      row.id, row.phone_normalized, row.name, row.first_order_date, row.created_at, row.version, row.branch, row.order_count, row.description, row.age_range, row.usia, row.gender, row.jenis_kelamin, row.aliases, row.branch_memberships, row.is_followed_up, row.followed_up_at,
    ]))
    await insertBatch(client, 'orders', ['id', 'customer_id', 'order_date', 'channel', 'raw_phone_input', 'created_at', 'branch', 'is_followed_up', 'followed_up_at'], orders.map((row) => [
      row.id, row.customer_id, row.order_date, row.channel, row.raw_phone_input, row.created_at, row.branch, row.is_followed_up, row.followed_up_at,
    ]))
    await insertBatch(client, 'app_settings', ['key', 'value'], settingsRows.filter((row) => row.key).map((row) => [row.key, row.value || '']), 'key')
    await client.query('commit')
    console.log('Supabase data migration completed')
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(`Supabase data migration failed: ${error.message}`)
  process.exitCode = 1
})
