// utils/readingPhotos.ts
import * as FileSystem from "expo-file-system";
import { decode as base64Decode } from "base-64";
import { supabase } from "@/utils/supabase"; // <-- adjust import to your supabase client location

const BUCKET = "reading-photos";

// Convert base64 string to Uint8Array (Supabase upload accepts Uint8Array)
function base64ToUint8Array(base64: string) {
  const binaryString = base64Decode(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

// Safer extension detection
function guessExtFromUri(uri: string) {
  const match = uri.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
  const ext = match?.[1]?.toLowerCase();
  // iOS can return HEIC; we’ll still upload it, but many viewers won’t display it reliably.
  // For maximum compatibility, convert to jpg using ImageManipulator (optional step below).
  return ext ?? "jpg";
}

function contentTypeFromExt(ext: string) {
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "heic") return "image/heic";
  if (ext === "webp") return "image/webp";
  return "application/octet-stream";
}

/**
 * Upload a local Expo image URI to Supabase Storage.
 * Returns the storage object path you should save into `public.readings.photo_path`.
 */
export async function uploadReadingPhoto(params: {
  readingId: string;
  localUri: string;
  // optional folder prefix, useful if you want to keep things organized
  prefix?: string; // default: "readings"
}) {
  const { readingId, localUri, prefix = "readings" } = params;

  // Read file as base64
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const ext = guessExtFromUri(localUri);
  const bytes = base64ToUint8Array(base64);

  const fileName = `${readingId}-${Date.now()}.${ext}`;
  const objectPath = `${prefix}/${fileName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, bytes, {
      contentType: contentTypeFromExt(ext),
      upsert: true,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  return objectPath;
}

/**
 * Create a signed URL for an existing stored photo path.
 */
export async function getReadingPhotoSignedUrl(params: {
  photoPath: string;
  expiresInSeconds?: number; // default: 3600
}) {
  const { photoPath, expiresInSeconds = 3600 } = params;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(photoPath, expiresInSeconds);

  if (error) throw new Error(`Signed URL failed: ${error.message}`);

  return data.signedUrl;
}
