
import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import AppNavigator from "./src/navigation/AppNavigator";
import { BackendProvider } from "./src/context/BackendContext";

// Firebase Imports
import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  initializeAuth, 
  getAuth, 
  getReactNativePersistence 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
   apiKey: "AIzaSyCusFxe30SM5L64MVDKHlis5qQ4c4iNfaI",
  authDomain: "aide-ad624.firebaseapp.com",
  projectId: "aide-ad624",
  storageBucket: "aide-ad624.firebasestorage.app",
  messagingSenderId: "385278582796",
  appId: "1:385278582796:web:4f69d5e7337c600af80e29"
  
};

// Prevent multiple initializations
let app, auth, db;
if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
    db = getFirestore(app);
  } catch (error) {
    console.error("Firebase initialization error", error);
  }
} else {
  app = getApp();
  auth = getAuth(app);
  db = getFirestore(app);
}

export default function App() {
  useEffect(() => {
    // Optional: Add any app-wide initialization logic here
    console.log('App initialized with Firebase');
  }, []);

  return (
    <SafeAreaProvider>
      <BackendProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </BackendProvider>
    </SafeAreaProvider>
  );
}

// Export Firebase instances
export { app, auth, db };