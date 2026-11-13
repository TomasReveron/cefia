// Service Worker for Firebase Cloud Messaging
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId
firebase.initializeApp({
  apiKey: "AIzaSyC5MqbItc43gwnVonGDf7n3gv14Lt1vOb0",
  authDomain: "cefia-web.firebaseapp.com",
  projectId: "cefia-web",
  storageBucket: "cefia-web.firebasestorage.app",
  messagingSenderId: "129366179058",
  appId: "1:129366179058:web:af6674347c2b2b0b24a46b"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Customize notification here
  const notificationTitle = payload.notification?.title || 'Nuevo Comunicado CEFIA';
  const notificationOptions = {
    body: payload.notification?.body || 'Hay un nuevo anuncio disponible.',
    icon: '/CefiaLogo.png',
    badge: '/CefiaLogo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
