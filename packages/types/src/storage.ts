export interface PresignedAvatarUpload {
  url: string;
  fields: Record<string, string>;
  key: string;
}
