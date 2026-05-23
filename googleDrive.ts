import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import firebaseConfig from "./firebase-applet-config.json";

// Initialize Firebase App and Auth once
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Google Drive access scopes for storing files & folders
provider.addScope("https://www.googleapis.com/auth/drive");

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void,
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token has not been fetched through popup yet
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;
    if (!accessToken) {
      throw new Error("Failed to get Google Drive access token from Firebase login.");
    }
    cachedAccessToken = accessToken;
    return { user: result.user, accessToken };
  } catch (error: any) {
    console.error("Sign in error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

export interface DriveFile {
  id: string;
  name: string;
  createdTime: string;
}

/**
 * Uploads a file (either JSON string or binary PDF Blob) to a custom folder in Google Drive.
 * Resolves or creates the folder automaticlly.
 */
export const uploadFileToGoogleDrive = async (
  accessToken: string,
  fileName: string,
  mimeType: string,
  fileContent: Blob | string,
  folderName?: string,
): Promise<any> => {
  let folderId: string | null = null;

  if (folderName) {
    try {
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(folderName)}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.files && searchData.files.length > 0) {
          folderId = searchData.files[0].id;
        } else {
          // Folder not found, create it
          const createFolderRes = await fetch(
            "https://www.googleapis.com/drive/v3/files",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: folderName,
                mimeType: "application/vnd.google-apps.folder",
              }),
            },
          );
          if (createFolderRes.ok) {
            const folderData = await createFolderRes.json();
            folderId = folderData.id;
          }
        }
      }
    } catch (err) {
      console.error("Failed to resolve folder, uploading to root:", err);
    }
  }

  const metadata = {
    name: fileName,
    mimeType: mimeType,
    parents: folderId ? [folderId] : undefined,
  };

  const boundary = "314159265358979323846";
  const delimiter = `\r\n--${boundary}\r\n`;
  const close_delim = `\r\n--${boundary}--`;

  const fileBlob =
    typeof fileContent === "string"
      ? new Blob([fileContent], { type: mimeType })
      : fileContent;
  const reader = new FileReader();

  const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(fileBlob);
  });

  const encoder = new TextEncoder();
  const part1 = encoder.encode(
    `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n${delimiter}Content-Type: ${mimeType}\r\n\r\n`,
  );
  const part2 = new Uint8Array(arrayBuffer);
  const part3 = encoder.encode(`\r\n${close_delim}`);

  const multipartBody = new Blob([part1, part2, part3], {
    type: `multipart/related; boundary=${boundary}`,
  });

  const uploadRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: multipartBody,
    },
  );

  if (!uploadRes.ok) {
    const errorText = await uploadRes.text();
    throw new Error(`Google Drive upload failed: ${errorText}`);
  }

  return await uploadRes.json();
};

/**
 * Lists backup files residing inside a parent folder on Google Drive.
 */
export const listBackupFilesFromGoogleDrive = async (
  accessToken: string,
  folderName: string = "Socrates_ECM_Backup",
): Promise<DriveFile[]> => {
  let folderId: string | null = null;
  try {
    const folderRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(folderName)}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    if (folderRes.ok) {
      const folderData = await folderRes.json();
      if (folderData.files && folderData.files.length > 0) {
        folderId = folderData.files[0].id;
      }
    }
  } catch (err) {
    console.error("Failed to find backup folder:", err);
  }

  let query =
    "name contains 'Socrates_Portfolio_Backup' and mimeType='application/json' and trashed=false";
  if (folderId) {
    query += ` and '${folderId}' in parents`;
  }

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=createdTime desc&fields=files(id,name,createdTime)&pageSize=10`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to list backups: ${err}`);
  }

  const data = await res.json();
  return data.files || [];
};

/**
 * Downloads a backup file from Google Drive and returns the parsed JSON content.
 */
export const downloadFileFromGoogleDrive = async (
  accessToken: string,
  fileId: string,
): Promise<any> => {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to download file: ${err}`);
  }
  return await res.json();
};
