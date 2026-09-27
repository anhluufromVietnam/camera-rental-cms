import { initializeApp, getApps, getApp } from "firebase/app"
import { getDatabase, type Database } from "firebase/database"
import { getStorage, type FirebaseStorage } from "firebase/storage"

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB1e8lXQAPLsexgUuaqjThmtGE5byJDBlU",
  authDomain: "nchupchoet.firebaseapp.com",
  projectId: "nchupchoet",
  storageBucket: "nchupchoet.firebasestorage.app",
  messagingSenderId: "535764584365",
  appId: "1:535764584365:web:b1957fa4f4fc9f5ba04324",
  measurementId: "G-G0RNP4W8CN"
};

// ✅ Kiểm tra nếu app đã được khởi tạo, dùng lại app cũ — tránh duplicate
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()

export const database: Database = getDatabase(app)
export const storage: FirebaseStorage = getStorage(app)

export { app }