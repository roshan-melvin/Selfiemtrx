import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAjFuiPM4IUkdn9uXBKWOGK9x3PexFFpsY",
  authDomain: "selfiemtrx-0.firebaseapp.com",
  projectId: "selfiemtrx-0",
  storageBucket: "selfiemtrx-0.firebasestorage.app",
  messagingSenderId: "2788170684",
  appId: "1:2788170684:web:9056ad90842ab29f5de9b9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app); 