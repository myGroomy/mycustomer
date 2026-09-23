// src/utils/vcardGenerator.ts

/**
 * Menormalisasi nomor telepon Indonesia ke format E.164 (+62xxxxxxxxxx)
 * Menerima input dengan awalan 0, 62, +62, atau tanpa awalan sama sekali,
 * serta membersihkan spasi/strip/tanda kurung.
 */
export function formatPhoneNumber(phone: string): string {
  let digits = phone.replace(/\D/g, '')

  if (digits.startsWith('0')) {
    digits = digits.slice(1) // buang 0 di depan
  } else if (digits.startsWith('62')) {
    digits = digits.slice(2) // buang 62 di depan
  }
  // sisanya (misal sudah "8123456789" tanpa prefix) dibiarkan apa adanya

  return `+62${digits}`
}

/**
 * Memformat nama menjadi structured name (N field) sesuai spesifikasi vCard:
 * Family;Given;Additional;Prefix;Suffix
 * Menangani nama 1 kata, 2 kata, maupun 3+ kata.
 */
function formatName(name: string): string {
  const parts = name.trim().split(/\s+/)
  const family = parts.length > 1 ? parts.pop() : ''
  const given = parts.join(' ')
  return `${family};${given};;;`
}

/**
 * Membuat satu blok vCard 3.0 untuk satu kontak.
 */
export function generateVCard(name: string, phone: string): string {
  const formatted = formatPhoneNumber(phone)

  return `BEGIN:VCARD
VERSION:3.0
N:${formatName(name)}
FN:${name}
TEL;TYPE=CELL:${formatted}
END:VCARD`
}

/**
 * Mendownload satu file .vcf untuk satu kontak.
 */
export function downloadVCard(name: string, phone: string): void {
  const vcard = generateVCard(name, phone)
  const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${name.replace(/\s+/g, '_')}.vcf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Menggabungkan banyak vCard menjadi satu string (multi-VCARD file).
 */
export function generateBulkVCard(
  contacts: Array<{ name: string; phone: string }>,
): string {
  return contacts.map((c) => generateVCard(c.name, c.phone)).join('\n')
}

/**
 * Mendownload satu file .vcf berisi banyak kontak sekaligus.
 */
export function downloadBulkVCard(contacts: Array<{ name: string; phone: string }>): void {
  const vcard = generateBulkVCard(contacts)
  const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'contacts.vcf'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}