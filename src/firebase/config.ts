// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Add your own Firebase configuration from your project settings
// https://console.firebase.google.com/project/_/settings/general/
const firebaseConfig = {
  apiKey: "AIzaSyChSNUT2q-huAPk5O2S2f_osyWu7nrq53E",
  authDomain: "registryweb-7cff7.firebaseapp.com",
  projectId: "registryweb-7cff7",
  storageBucket: "registryweb-7cff7.firebasestorage.app",
  messagingSenderId: "1090432528367",
  appId: "1:1090432528367:web:dabbc8ff5db8d53d52901a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
