/**
 * Đồng bộ dữ liệu từ Firebase cũ sang Firebase mới (chạy trực tiếp trên trình duyệt)
 *
 * Firebase cũ: https://bookingcamera-default-rtdb.asia-southeast1.firebasedatabase.app/
 * Firebase mới: dự án hiện tại (nchupchoet) — dùng app đã khởi tạo trong firebase.config.js
 *
 * Port từ scripts/migrate-firebase.ts để gắn vào nút "Đồng bộ" ở trang Cài đặt.
 */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { getDatabase, ref, get, set } from "firebase/database"
import { getAuth, signInWithEmailAndPassword } from "firebase/auth"
import { app as newApp } from "@/firebase.config"

// Firebase cũ (nguồn dữ liệu)
const OLD_FIREBASE_DATABASE_URL =
  "https://bookingcamera-default-rtdb.asia-southeast1.firebasedatabase.app/"

const OLD_APP_NAME = "old-firebase-sync"

export interface SyncProgress {
  step: string
  current: number
  total: number
}

export interface SyncResult {
  cameras: number
  bookings: { success: number; error: number }
  settings: boolean
  mainBranchId: string
  errors: string[]
}

async function getOldApp(): Promise<FirebaseApp> {
  const existing = getApps().find((a) => a.name === OLD_APP_NAME)
  if (existing) return existing
  return initializeApp({ databaseURL: OLD_FIREBASE_DATABASE_URL }, OLD_APP_NAME)
}

export async function syncFromOldFirebase(
  email: string,
  password: string,
  onProgress?: (progress: SyncProgress) => void,
): Promise<SyncResult> {
  const report = (step: string, current = 0, total = 0) => onProgress?.({ step, current, total })

  const result: SyncResult = {
    cameras: 0,
    bookings: { success: 0, error: 0 },
    settings: false,
    mainBranchId: "main",
    errors: [],
  }

  const oldApp = await getOldApp()
  const oldDb = getDatabase(oldApp)
  const newDb = getDatabase(newApp)

  // 1. Đăng nhập vào Firebase mới
  report("Đang đăng nhập vào Firebase mới...")
  try {
    await signInWithEmailAndPassword(getAuth(newApp), email, password)
  } catch (error: any) {
    throw new Error(`Đăng nhập thất bại: ${error?.message || "Sai email hoặc mật khẩu"}`)
  }

  // 2. Lấy chi nhánh chính từ Firebase mới
  report("Đang lấy thông tin chi nhánh chính...")
  try {
    const branchesSnapshot = await get(ref(newDb, "branches"))
    if (branchesSnapshot.exists()) {
      const branches = branchesSnapshot.val()
      const mainBranch = Object.entries(branches).find(
        ([_, value]: [string, any]) => value?.isMain,
      )
      if (mainBranch) result.mainBranchId = mainBranch[0]
    }
  } catch (error: any) {
    result.errors.push(`Lỗi lấy chi nhánh chính: ${error?.message || error}`)
  }

  const collections = ["cameras", "bookings", "settings"]

  for (const collection of collections) {
    report(`Đang đọc dữ liệu ${collection} từ Firebase cũ...`)

    let data: Record<string, any>
    try {
      const snapshot = await get(ref(oldDb, collection))
      if (!snapshot.exists()) continue
      data = snapshot.val()
    } catch (error: any) {
      result.errors.push(`Lỗi đọc ${collection} từ Firebase cũ: ${error?.message || error}`)
      continue
    }

    const entries = Object.entries(data)

    if (collection === "cameras") {
      // Thêm branchId cho cameras (mặc định là chi nhánh chính)
      let done = 0
      for (const [key, value] of entries) {
        const cameraData = { ...(value as any) }
        if (!cameraData.branchId) {
          cameraData.branchId = result.mainBranchId
        }
        try {
          await set(ref(newDb, `cameras/${key}`), cameraData)
          result.cameras++
        } catch (error: any) {
          result.errors.push(`Lỗi ghi camera ${key}: ${error?.message || error}`)
        }
        done++
        report(`Đang đồng bộ cameras`, done, entries.length)
      }
    } else if (collection === "settings") {
      try {
        await set(ref(newDb, collection), data)
        result.settings = true
      } catch (error: any) {
        result.errors.push(`Lỗi ghi settings: ${error?.message || error}`)
      }
    } else if (collection === "bookings") {
      // Đồng bộ batch để nhanh hơn
      const batchSize = 50
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize)
        const results = await Promise.allSettled(
          batch.map(([key, value]) => set(ref(newDb, `bookings/${key}`), value)),
        )
        for (const r of results) {
          if (r.status === "fulfilled") result.bookings.success++
          else result.bookings.error++
        }
        report(`Đang đồng bộ bookings`, Math.min(i + batchSize, entries.length), entries.length)
      }
    }
  }

  return result
}
