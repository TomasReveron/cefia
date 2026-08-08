import admin from 'firebase-admin';

// Initialize firebase-admin safely
if (!admin.apps.length) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined;

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    console.log("Firebase Admin inicializado correctamente.");
  } catch (err) {
    console.error('Error al inicializar Firebase Admin:', err);
  }
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  const { title, body } = req.body;
  if (!title || !body) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: title o body.' });
  }

  try {
    const db = admin.firestore();
    const usersSnap = await db.collection('usuarios').get();
    
    const tokens = [];
    usersSnap.forEach((doc) => {
      const data = doc.data();
      if (data.fcmTokens && Array.isArray(data.fcmTokens)) {
        tokens.push(...data.fcmTokens);
      }
    });

    // Remove duplicates
    const uniqueTokens = [...new Set(tokens)];

    if (uniqueTokens.length === 0) {
      return res.status(200).json({ message: 'No hay estudiantes registrados con tokens FCM.' });
    }

    const payload = {
      notification: {
        title: title,
        body: body,
      },
      tokens: uniqueTokens,
    };

    const response = await admin.messaging().sendEachForMulticast(payload);
    
    return res.status(200).json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (err) {
    console.error('Error al enviar notificaciones:', err);
    return res.status(500).json({ error: 'Error interno del servidor.', details: err.message });
  }
}
