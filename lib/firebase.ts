import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export const firebaseConfig = {
  apiKey: "AIzaSyCqx9UA6kWBGPm4lcTlAWiXTT7gn5G85JY",
  authDomain: "supi-fda67.firebaseapp.com",
  projectId: "supi-fda67",
  storageBucket: "supi-fda67.firebasestorage.app",
  messagingSenderId: "169426257638",
  appId: "1:169426257638:web:b6753c915e364c7bc69d27",
  measurementId: "G-N5740N57GC"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);