import { initializeApp } from 'firebase/app';
import { 
initializeAuth, 
getReactNativePersistence,
getAuth 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
apiKey: "AIzaSyA6NOYNehpIXFNVrLoPLloZ6fcajBb9kns",
authDomain: "aide-e77fe.firebaseapp.com",
projectId: "aide-e77fe",
storageBucket: "aide-e77fe.firebasestorage.app",
messagingSenderId: "169943654910",
appId: "1:169943654910:web:bd76eaffe4a5158a7c60af",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Initialize Firestore
const db = getFirestore(app);

// Initialize Storage
const storage = getStorage(app);

// Initialize Functions - ADD THIS!
const functions = getFunctions(app);

export { 
app, 
auth, 
db,
storage,
functions
};