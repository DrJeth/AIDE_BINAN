// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyA6NOYNehpIXFNVrLoPLloZ6fcajBb9kns",
  authDomain: "aide-e77fe.firebaseapp.com",
  projectId: "aide-e77fe",
  storageBucket: "aide-e77fe.firebasestorage.app",
  messagingSenderId: "169943654910",
  appId: "1:169943654910:web:bd76eaffe4a5158a7c60af",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
