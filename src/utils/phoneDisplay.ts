/**
 * Formats a normalized Indonesian phone number for human-readable display.
 * Stored and matching values remain in the application's normalized format.
 */
export function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return `+${digits}`;
  if (digits.startsWith("0")) return `+62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `+62${digits}`;
  return `+62${digits}`;
}
