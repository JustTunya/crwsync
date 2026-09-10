import { PresignedAvatarUpload } from "@crwsync/types";

export async function uploadToPresignedUrl(presign: PresignedAvatarUpload, file: File): Promise<void> {
  const response = await fetch(presign.url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  if (!response.ok) throw new Error("Upload failed");
}
