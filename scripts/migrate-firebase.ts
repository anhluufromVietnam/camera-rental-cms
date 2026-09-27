/**
 * Script đồng bộ dữ liệu từ Firebase cũ sang Firebase mới
 * 
 * Firebase cũ: https://bookingcamera-default-rtdb.asia-southeast1.firebasedatabase.app/
 * Firebase mới: https://camera-rental-9f2dd-default-rtdb.asia-southeast1.firebasedatabase.app/
 * 
 * Chạy: npx tsx scripts/migrate-firebase.ts
 */

import { initializeApp } from "firebase/app"
import { getDatabase, ref, set, get } from "firebase/database"
import { getAuth, signInWithEmailAndPassword } from "firebase/auth"

// Firebase cũ (source)
const oldFirebaseConfig = {
  databaseURL: "https://bookingcamera-default-rtdb.asia-southeast1.firebasedatabase.app/"
}

const newFirebaseConfig = {
  apiKey: "AIzaSyB1e8lXQAPLsexgUuaqjThmtGE5byJDBlU",
  authDomain: "nchupchoet.firebaseapp.com",
  projectId: "nchupchoet",
  storageBucket: "nchupchoet.firebasestorage.app",
  messagingSenderId: "535764584365",
  appId: "1:535764584365:web:b1957fa4f4fc9f5ba04324",
  measurementId: "G-G0RNP4W8CN"
};

async function migrateData() {
  console.log("🚀 Bắt đầu đồng bộ dữ liệu Firebase...\n")

  // Initialize apps
  const oldApp = initializeApp(oldFirebaseConfig, "old")
  const newApp = initializeApp(newFirebaseConfig, "new")

  const oldDb = getDatabase(oldApp)
  const newDb = getDatabase(newApp)
  const newAuth = getAuth(newApp)

  // Đăng nhập vào Firebase mới
  console.log("🔐 Đang đăng nhập vào Firebase mới...")
  try {
    await signInWithEmailAndPassword(newAuth, "admin@gmail.com", "123456")
    console.log("   ✅ Đăng nhập thành công!\n")
  } catch (error) {
    console.error("   ❌ Lỗi đăng nhập:", error)
    return
  }

  // Lấy mainBranchId từ Firebase mới
  console.log("📍 Lấy thông tin chi nhánh chính...")
  const branchesSnapshot = await get(ref(newDb, "branches"))
  let mainBranchId = "main"
  if (branchesSnapshot.exists()) {
    const branches = branchesSnapshot.val()
    const mainBranch = Object.entries(branches).find(
      ([_, value]: [string, any]) => value.isMain
    )
    if (mainBranch) {
      mainBranchId = mainBranch[0]
      console.log(`   ✅ Chi nhánh chính: ${mainBranchId}\n`)
    }
  }

  const collections = ["cameras", "bookings", "settings"]

  for (const collection of collections) {
    console.log(`📦 Đang đồng bộ collection: ${collection}`)
    
    try {
      // Read from old
      const oldRef = ref(oldDb, collection)
      const snapshot = await get(oldRef)

      if (!snapshot.exists()) {
        console.log(`   ⚠️  Collection ${collection} không có dữ liệu\n`)
        continue
      }

      const data = snapshot.val()
      const count = Object.keys(data).length
      console.log(`   📊 Tìm thấy ${count} records`)

      // Write to new (with branchId for cameras)
      if (collection === "cameras") {
        // Thêm branchId cho cameras (mặc định là chi nhánh chính)
        for (const [key, value] of Object.entries(data)) {
          const cameraData = value as any
          // Thêm branchId nếu chưa có
          if (!cameraData.branchId) {
            cameraData.branchId = "-P2DENfNthcIyBTxQKNB"
          }
          await set(ref(newDb, `${collection}/${key}`), cameraData)
        }
      } else if (collection === "settings") {
        // Settings giữ nguyên
        await set(ref(newDb, collection), data)
      } else if (collection === "bookings") {
        // Bookings - đồng bộ batch để nhanh hơn
        const entries = Object.entries(data)
        const batchSize = 50 // Xử lý 50 record cùng lúc
        let successCount = 0
        let errorCount = 0
        
        console.log(`   📊 Bắt đầu đồng bộ ${entries.length} bookings (batch size: ${batchSize})...`)
        
        for (let i = 0; i < entries.length; i += batchSize) {
          const batch = entries.slice(i, i + batchSize)
          
          const results = await Promise.allSettled(
            batch.map(([key, value]) => 
              set(ref(newDb, `${collection}/${key}`), value)
            )
          )
          
          results.forEach(result => {
            if (result.status === 'fulfilled') successCount++
            else errorCount++
          })
          
          const progress = Math.min(i + batchSize, entries.length)
          process.stdout.write(`\r   📊 Đã xử lý ${progress}/${entries.length} records (${Math.round(progress/entries.length*100)}%)`)
        }
        
        console.log(`\n   ✅ Thành công: ${successCount}, Lỗi: ${errorCount}\n`)
        continue
      }

      console.log(`   ✅ Đã đồng bộ ${count} records\n`)
    } catch (error) {
      console.error(`   ❌ Lỗi đồng bộ ${collection}:`, error, "\n")
    }
  }

  console.log("🎉 Hoàn tất đồng bộ dữ liệu!")
}

// Chạy migration
migrateData().catch(console.error)
