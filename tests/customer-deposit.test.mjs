import assert from "node:assert/strict"
import test from "node:test"
import { findReturningCustomerBooking, normalizeCustomerPhone } from "../lib/customer-deposit.ts"

test("matches local and international Vietnamese phone formats", () => {
  for (const value of ["0901234567", "090 123 4567", "+84 901 234 567", "84901234567"]) {
    assert.equal(normalizeCustomerPhone(value), "0901234567")
  }
})

test("invalid or empty phone numbers cannot qualify for a deposit waiver", () => {
  for (const value of ["", "123", "phone0901234567", "+84oops901234567"]) {
    assert.equal(normalizeCustomerPhone(value), "")
    assert.equal(findReturningCustomerBooking([{ id: "a", status: "completed", customerPhone: "" }], value), undefined)
  }
})

test("only previously confirmed bookings qualify, including later rental states", () => {
  for (const status of ["confirmed", "active", "overtime", "completed"]) {
    assert.equal(findReturningCustomerBooking([{ id: "prior", customerPhone: "+84 901 234 567", status }], "0901234567")?.id, "prior")
  }
  for (const status of ["pending", "cancelled", "unknown", undefined]) {
    assert.equal(findReturningCustomerBooking([{ id: "prior", customerPhone: "0901234567", status }], "0901234567"), undefined)
  }
})

test("changing the phone removes the waiver; pending orders do not hide valid history", () => {
  const history = [
    { id: "pending", customerPhone: "0901234567", status: "pending" },
    { id: "completed", customerPhone: "0901234567", status: "completed" },
  ]
  assert.equal(findReturningCustomerBooking(history, "0901234567")?.id, "completed")
  assert.equal(findReturningCustomerBooking(history, "0912345678"), undefined)
  assert.equal(findReturningCustomerBooking([], "0901234567"), undefined)
})
