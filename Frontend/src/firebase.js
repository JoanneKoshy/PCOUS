import { initializeApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyBeTuGlnqGhzDP7Kr1tC2nhnh7jyVVF5vQ",
  authDomain: "pcous-85e6a.firebaseapp.com",
  projectId: "pcous-85e6a",
  storageBucket: "pcous-85e6a.firebasestorage.app",
  messagingSenderId: "572444664247",
  appId: "1:572444664247:web:13a5780a001ae48ae40832"
};

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const provider = new GoogleAuthProvider()
export const db = getFirestore(app)