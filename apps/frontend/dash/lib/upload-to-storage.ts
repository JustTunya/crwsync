import { PresignedAvatarUpload } from "@crwsync/types";

export async function uploadToPresignedPost(presign: PresignedAvatarUpload, file: File): Promise<void> {
  const formData = new FormData();
  Object.entries(presign.fields).forEach(([key, value]) => formData.append(key, value));
  formData.append("file", file);

  const response = await fetch(presign.url, { method: "POST", body: formData });
  if (!response.ok) throw new Error("Upload failed");
}
