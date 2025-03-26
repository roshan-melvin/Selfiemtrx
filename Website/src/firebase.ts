import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAK_n9K6nT5dmmUsdQkWpldXP5oiXKp05w",
  authDomain: "selfiemtrx-0.firebaseapp.com",
  projectId: "selfiemtrx-0",
  storageBucket: "selfiemtrx-0.firebasestorage.app",
  messagingSenderId: "522971872039",
  appId: "1:522971872039:web:1641074d7a1fd10569c702",
  measurementId: "G-EQT6MLRF1N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app); 