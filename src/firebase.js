import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth (Firestore lives in ./firebaseDb.js)
export const auth = getAuth(app);

// Lazy-load Firebase Messaging only when requesting notification permissions (login/register)
export const requestForToken = async () => {
  try {
    if (typeof Notification === 'undefined') return null;

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      const permission = await Notification.requestPermission();
      console.warn("VITE_FIREBASE_VAPID_KEY no está configurada en .env. Se concedió el permiso pero no se generó el token FCM.");
      return { token: null, permission };
    }

    const { getMessaging, getToken, isSupported } = await import("firebase/messaging");
    const supported = await isSupported();
    if (!supported) return null;

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const messaging = getMessaging(app);
      const token = await getToken(messaging, { vapidKey });
      return { token, permission };
    }
    return { token: null, permission };
  } catch (err) {
    console.warn("Firebase Messaging no es soportado o falló al generar el token FCM:", err);
    return null;
  }
};

export default app;
