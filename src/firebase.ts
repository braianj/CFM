import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { initializeFirestore } from 'firebase/firestore'

// Google Analytics identifier for the web app. It is public client configuration,
// like the rest of this object. Emptying it turns every tracking call into a no-op
// and drops the analytics SDK from the bundle.
export const MEASUREMENT_ID = 'G-73QTCCRCMW'

const firebaseConfig = {
  apiKey: 'AIzaSyAUFE81PWVzJGQKqfUZ83ULDMs19B38Rk0',
  authDomain: 'cfm-hockey.firebaseapp.com',
  projectId: 'cfm-hockey',
  storageBucket: 'cfm-hockey.firebasestorage.app',
  messagingSenderId: '290741191055',
  appId: '1:290741191055:web:f8550ce7794a3d983b4bfa',
  measurementId: MEASUREMENT_ID,
}

export const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
// Optional fields are written as `undefined` all over the panel (a goal with no
// assist, a player with no number). Without this, every one of those writes throws.
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true })
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

export const ADMIN_EMAIL = 'braianj@gmail.com'
