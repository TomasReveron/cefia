const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Load environment variables manually from .env
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      const key = trimmed.substring(0, idx).trim();
      let val = trimmed.substring(idx + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1);
      } else if (val.startsWith("'") && val.endsWith("'")) {
        val = val.substring(1, val.length - 1);
      }
      process.env[key] = val;
    }
  });
}

const JSON_PATH = path.join(__dirname, '../public/exam_data.json');

if (!fs.existsSync(JSON_PATH)) {
  console.error(`❌ No se encontró el archivo JSON de exámenes en: ${JSON_PATH}`);
  process.exit(1);
}

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKeyRaw) {
  console.error('❌ Falta alguna de las variables FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL o FIREBASE_PRIVATE_KEY en el archivo .env.');
  process.exit(1);
}

try {
  console.log('⏳ Inicializando Firebase Admin desde variables de entorno del .env...');
  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey
    })
  });

  const db = getFirestore();
  console.log('⏳ Leyendo archivo public/exam_data.json...');
  const examDataRaw = fs.readFileSync(JSON_PATH, 'utf8');
  const examData = JSON.parse(examDataRaw);

  console.log('⏳ Subiendo datos de exámenes a Firestore...');
  db.collection('examenes').doc('main_data').set({
    data: examData,
    updatedAt: new Date().toISOString()
  }).then(() => {
    console.log('✅ ¡Éxito! Los datos de exámenes han sido subidos a Firestore (documento: examenes/main_data) usando las credenciales del .env.');
    process.exit(0);
  }).catch((err) => {
    console.error('❌ Error al escribir en Firestore:', err);
    process.exit(1);
  });

} catch (error) {
  console.error('❌ Error general durante la subida:', error.message);
  process.exit(1);
}
