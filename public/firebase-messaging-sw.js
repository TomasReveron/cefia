// Service Worker for Firebase Cloud Messaging
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId
firebase.initializeApp({
  apiKey: "AIzaSyDvLg9xHKPAo4-Car0rFrnx16gEl1PJw6I",
  authDomain: "cefiapagina.firebaseapp.com",
  projectId: "cefiapagina",
  storageBucket: "cefiapagina.firebasestorage.app",
  messagingSenderId: "817375541733",
  appId: "1:817375541733:web:8b59060d7a4d636a2e170c"
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
