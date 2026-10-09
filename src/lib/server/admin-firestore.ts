import 'server-only';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export function getAdminFirestore() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not configured');
  // Parse only on server request, not at module import time, so deployment errors are explicit.
  let account: { project_id?: string; client_email?: string; private_key?: string };
  try {
    account = JSON.parse(raw);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT must be a service-account JSON object');
  }
  if (account.project_id !== 'mongna-vod' || !account.client_email || !account.private_key) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT has invalid project or credentials');
  }
  const app = getApps().find(a => a.name === 'mongna-server-admin') ??
    initializeApp({
      credential: cert({
        projectId: account.project_id,
        clientEmail: account.client_email,
        privateKey: account.private_key.replace(/\\n/g, '\n')
      })
    }, 'mongna-server-admin');
  return getFirestore(app);
}
