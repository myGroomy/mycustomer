import { getSheetData, appendRow, updateRow, deleteRow } from './sheetsService'

const BRANCHES_SHEET = 'branches'
const USERS_SHEET = 'users'

export const DEFAULT_BRANCHES: Branch[] = [
  { id: '00000000-0000-0000-0000-000000000101', code: 'CMH', name: 'Cimahi (CMH)', created_at: '' },
  { id: '00000000-0000-0000-0000-000000000102', code: 'BDG', name: 'Bandung (BDG)', created_at: '' },
]

export interface Branch {
  id: string
  code: string
  name: string
  created_at: string
  address?: string
  is_active?: boolean
}

export interface ManagedUser {
  id: string
  username: string
  pin: string
  role: string
  created_at: string
  branch: string
}

export const ROLE_OPTIONS = [
  { value: 'owner', label: 'Owner / Admin' },
  { value: 'kasir', label: 'Kasir' },
]

export function isManagerRole(role: string | undefined | null): boolean {
  return role === 'owner' || role === 'admin'
}

// ── CABANG ───────────────────────────────────────────────────────────────

export async function getBranches(): Promise<Branch[]> {
  try {
    const rows = await getSheetData(BRANCHES_SHEET)
    if (rows.length === 0) return DEFAULT_BRANCHES
    return rows.map((r) => ({
      id: r.id || '',
      code: r.code || '',
      name: r.name || r.code || '',
      created_at: r.created_at || '',
      address: r.address || '',
      is_active: r.is_active !== 'FALSE' && r.is_active !== 'false',
    }))
  } catch {
    return DEFAULT_BRANCHES
  }
}

export async function createBranch(code: string, name: string): Promise<void> {
  await appendRow(BRANCHES_SHEET, {
    id: crypto.randomUUID(),
    code: code.trim(),
    name: name.trim(),
    created_at: new Date().toISOString(),
    address: '',
    is_active: 'TRUE',
  })
}

export async function updateBranch(rowIndex: number, branch: Branch): Promise<void> {
  await updateRow(BRANCHES_SHEET, rowIndex, {
    id: branch.id,
    code: branch.code.trim(),
    name: branch.name.trim(),
    created_at: branch.created_at,
    address: branch.address || '',
    is_active: branch.is_active === false ? 'FALSE' : 'TRUE',
  })
}

export async function deleteBranch(rowIndex: number): Promise<void> {
  await deleteRow(BRANCHES_SHEET, rowIndex)
}

// ── USER ─────────────────────────────────────────────────────────────────

export async function getUsers(): Promise<ManagedUser[]> {
  const rows = await getSheetData(USERS_SHEET)
  return rows.map((r) => ({
    id: r.id || '',
    username: r.username || '',
    pin: r.pin || '',
    role: r.role || 'kasir',
    created_at: r.created_at || '',
    branch: r.branch || '',
  }))
}

export async function createUser(
  username: string,
  pin: string,
  role: string,
  branch: string,
): Promise<void> {
  await appendRow(USERS_SHEET, {
    id: crypto.randomUUID(),
    username: username.trim(),
    pin,
    role,
    created_at: new Date().toISOString(),
    branch,
  })
}

export async function updateUser(
  rowIndex: number,
  user: ManagedUser,
): Promise<void> {
  await updateRow(USERS_SHEET, rowIndex, {
    id: user.id,
    username: user.username.trim(),
    pin: user.pin,
    role: user.role,
    created_at: user.created_at,
    branch: user.branch,
  })
}

export async function deleteUser(rowIndex: number): Promise<void> {
  await deleteRow(USERS_SHEET, rowIndex)
}