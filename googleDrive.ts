import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { auth } from "./firebase";

const provider = new GoogleAuthProvider();
// Request Google Workspace scopes for Sheets, Docs, Drive, and Chat
provider.addScope("https://www.googleapis.com/auth/drive");
provider.addScope("https://www.googleapis.com/auth/spreadsheets");
provider.addScope("https://www.googleapis.com/auth/documents");
provider.addScope("https://www.googleapis.com/auth/chat.spaces.readonly");
provider.addScope("https://www.googleapis.com/auth/chat.messages.create");

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void,
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (!cachedAccessToken) {
        cachedAccessToken = localStorage.getItem("gdrive_access_token");
      }
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      localStorage.removeItem("gdrive_access_token");
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  if (isSigningIn) {
    console.warn("Sign-in process is already in progress.");
    return null;
  }
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;
    if (!accessToken) {
      throw new Error("Failed to get Google Drive access token from Firebase login.");
    }
    cachedAccessToken = accessToken;
    localStorage.setItem("gdrive_access_token", accessToken);
    return { user: result.user, accessToken };
  } catch (error: any) {
    const errorCode = error?.code || "";
    const errorMsg = error?.message || "";
    if (
      errorCode === "auth/cancelled-popup-request" ||
      errorCode === "auth/popup-closed-by-user" ||
      errorMsg.includes("cancelled-popup-request") ||
      errorMsg.includes("popup-closed-by-user")
    ) {
      console.warn("Sign in process was cancelled or closed by user:", errorMsg);
      return null;
    }
    console.error("Sign in error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (!cachedAccessToken) {
    cachedAccessToken = localStorage.getItem("gdrive_access_token");
  }
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  localStorage.removeItem("gdrive_access_token");
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
      if (searchRes.status === 401) {
        localStorage.removeItem("gdrive_access_token");
        cachedAccessToken = null;
        throw new Error("401_UNAUTHORIZED");
      }
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
          if (createFolderRes.status === 401) {
            localStorage.removeItem("gdrive_access_token");
            cachedAccessToken = null;
            throw new Error("401_UNAUTHORIZED");
          }
          if (createFolderRes.ok) {
            const folderData = await createFolderRes.json();
            folderId = folderData.id;
          }
        }
      }
    } catch (err: any) {
      if (err.message === "401_UNAUTHORIZED") {
        throw err;
      }
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
    if (uploadRes.status === 401) {
      localStorage.removeItem("gdrive_access_token");
      cachedAccessToken = null;
      throw new Error("401_UNAUTHORIZED");
    }
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
    if (folderRes.status === 401) {
      localStorage.removeItem("gdrive_access_token");
      cachedAccessToken = null;
      throw new Error("401_UNAUTHORIZED");
    }
    if (folderRes.ok) {
      const folderData = await folderRes.json();
      if (folderData.files && folderData.files.length > 0) {
        folderId = folderData.files[0].id;
      }
    }
  } catch (err: any) {
    if (err.message === "401_UNAUTHORIZED") {
      throw err;
    }
    console.error("Failed to find backup folder:", err);
  }

  let query =
    "(name contains 'Socrates_Portfolio_Backup' or name contains 'Socrates_Watchlist_Backup') and mimeType='application/json' and trashed=false";
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
    if (res.status === 401) {
      localStorage.removeItem("gdrive_access_token");
      cachedAccessToken = null;
      throw new Error("401_UNAUTHORIZED");
    }
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
    if (res.status === 401) {
      localStorage.removeItem("gdrive_access_token");
      cachedAccessToken = null;
      throw new Error("401_UNAUTHORIZED");
    }
    const err = await res.text();
    throw new Error(`Failed to download file: ${err}`);
  }
  return await res.json();
};
