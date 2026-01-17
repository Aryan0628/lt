import admin from "firebase-admin";
import { createRequire } from "module";
const req = createRequire(import.meta.url);

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (error) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT:", error);
  }
} 
else {
  try {
    serviceAccount = req("../../serviceAccountKey.json");
  } catch (error) {
    console.error("No serviceAccountKey.json found and FIREBASE_SERVICE_ACCOUNT not set.");
  }
}

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const db = admin.firestore();
export const auth = admin.auth();
export const FieldValue = admin.firestore.FieldValue;