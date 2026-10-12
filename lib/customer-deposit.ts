export interface CustomerBookingHistory {
  id: string
  customerPhone?: string
  status?: string
}

const returningCustomerStatuses = new Set(["confirmed", "active", "overtime", "completed"])

// Match the same Vietnamese phone number with local or +84 formatting.
export function normalizeCustomerPhone(value: string): string {
  const compact = value.trim().replace(/[\s().-]/g, "")
  if (!/^\+?\d+$/.test(compact)) return ""
  const digits = compact.replace(/^\+/, "")
  const local = digits.startsWith("84") && digits.length >= 11
    ? `0${digits.slice(2)}`
    : digits
  return /^\d{9,11}$/.test(local) ? local : ""
}

export function findReturningCustomerBooking(
  bookings: CustomerBookingHistory[],
  customerPhone: string,
): CustomerBookingHistory | undefined {
  const phone = normalizeCustomerPhone(customerPhone)
  if (!phone) return undefined
  return bookings.find((booking) =>
    returningCustomerStatuses.has(booking.status || "") &&
    normalizeCustomerPhone(booking.customerPhone || "") === phone,
  )
}

export const depositMethods = ["cccd-taisan", "cccd-80", "100"]
