import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer, Firestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore targeting the provisioned databaseId
let firestoreInstance: Firestore;
try {
  firestoreInstance = firebaseConfig.firestoreDatabaseId
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);
} catch (e) {
  console.warn('Failed to bind custom database ID, falling back to default:', e);
  firestoreInstance = getFirestore(app);
}

export const db = firestoreInstance;

// Direct console link to manage/upgrade database quota if needed
export const firestoreConsoleUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data?openUpgradeDialog=true`;

// Initialize Auth
export const auth = getAuth(app);

// Test connection on startup per Firebase integration guidelines
export async function testFirebaseConnection(): Promise<{ connected: boolean; error?: string; isQuota?: boolean }> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return { connected: true };
  } catch (error: any) {
    const message = (error?.message || '').toLowerCase();
    const code = error?.code || '';
    const isQuota = message.includes('quota') || code === 'resource-exhausted';
    const isPermission = message.includes('permission') || code === 'permission-denied';

    if (isQuota || isPermission) {
      console.warn('Firestore unavailable or quota exceeded:', error?.message);
      return {
        connected: false,
        isQuota: true,
        error: `Batas kuota harian gratis Firebase tercapai atau koneksi dibatasi. Data dimuat dari cache lokal browser. Kuota akan otomatis di-reset besok atau tingkatkan ke plan Blaze: ${firestoreConsoleUrl}`,
      };
    }

    // Document not found is fine, means connection succeeded
    if (code === 'not-found') {
      return { connected: true };
    }

    return {
      connected: false,
      error: error?.message || 'Gagal terhubung ke Cloud Firestore',
    };
  }
}
