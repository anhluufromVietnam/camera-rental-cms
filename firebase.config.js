// /lib/firebase.ts

import { initializeApp, getApps, getApp } from "firebase/app"
import { getDatabase } from "firebase/database"
import { getStorage } from "firebase/storage"
import { getAuth } from "firebase/auth"

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB1e8lXQAPLsexgUuaqjThmtGE5byJDBlU",
  authDomain: "nchupchoet.firebaseapp.com",
  databaseURL: "https://nchupchoet-default-rtdb.firebaseio.com",
  projectId: "nchupchoet",
  storageBucket: "nchupchoet.firebasestorage.app",
  messagingSenderId: "535764584365",
  appId: "1:535764584365:web:b1957fa4f4fc9f5ba04324",
  measurementId: "G-G0RNP4W8CN",
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()

// Firebase services
export const db = getDatabase(app)
export const storage = getStorage(app)
export const auth = getAuth(app)

// Export Firebase app
export { app }