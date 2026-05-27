import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB01GDWyOLXTy9iPSSW-f9wVOKXLSpd4Qs",
  authDomain: "vote-71770.firebaseapp.com",
  projectId: "vote-71770",
  storageBucket: "vote-71770.firebasestorage.app",
  messagingSenderId: "325145094274",
  appId: "1:325145094274:web:01d93b9d696fc291cb2c9b",
  measurementId: "G-SHWT5LKT47"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
