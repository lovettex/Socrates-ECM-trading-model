import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";

// Initialize standard Firebase App & Config
const app = initializeApp(firebaseConfig);

// Initialize Auth & Firestore (with custom firestoreDatabaseId if provided, or default)
const configAny: any = firebaseConfig;
export const db = getFirestore(app, configAny.firestoreDatabaseId || "(default)");
export const auth = getAuth(app);

// Operational Error Handling Types and Helpers
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write"
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Operational Security Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Mandatory testConnection helper on application initialization. Delayed to let browser sockets warm up.
async function testConnection() {
  if (typeof window === "undefined") return;
  setTimeout(async () => {
    try {
      await getDocFromServer(doc(db, "test", "connection"));
    } catch (error) {
      if (error instanceof Error && error.message.includes("the client is offline")) {
        console.log("Firebase connection status: Client is offline. Firestore will operate in offline cache mode.");
      }
    }
  }, 4000);
}
testConnection();
