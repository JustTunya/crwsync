import { randomUUID } from "crypto";
import { BadRequestException, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { extname } from "path";
import { PresignedAvatarUpload } from "@crwsync/types";

const AVATAR_PREFIX = "avatars/";
const ATTACHMENT_PREFIX = "attachments/";
const MAX_AVATAR_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_ATTACHMENT_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB
const PRESIGN_EXPIRY_SECONDS = 300; // 5 minutes
const PRESIGN_GET_EXPIRY_SECONDS = 3600; // 1 hour

const AVATAR_MIME_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>("STORAGE_BUCKET")!;
    this.client = new S3Client({
      endpoint: this.config.get<string>("STORAGE_ENDPOINT"),
      region: this.config.get<string>("STORAGE_REGION"),
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.get<string>("STORAGE_ACCESS_KEY")!,
        secretAccessKey: this.config.get<string>("STORAGE_SECRET_KEY")!,
      },
    });
  }

  async onModuleInit() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Created storage bucket ${this.bucket}`);
      } catch (error) {
        this.logger.warn(`Could not verify or create storage bucket ${this.bucket}: ${error}`);
      }
    }
  }

  async presignAvatarUpload(contentType: string, ownerId: string): Promise<PresignedAvatarUpload> {
    const ext = AVATAR_MIME_EXTENSIONS[contentType];
    if (!ext) throw new BadRequestException("Unsupported image type");

    const key = `${ownerId}_${randomUUID()}.${ext}`;

    const { url, fields } = await createPresignedPost(this.client, {
      Bucket: this.bucket,
      Key: `${AVATAR_PREFIX}${key}`,
      Conditions: [
        ["content-length-range", 0, MAX_AVATAR_UPLOAD_BYTES],
        { "Content-Type": contentType },
      ],
      Fields: { "Content-Type": contentType },
      Expires: PRESIGN_EXPIRY_SECONDS,
    });

    return { url, fields, key };
  }

  async presignGet(key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: `${AVATAR_PREFIX}${key}` });
    return getSignedUrl(this.client, command, { expiresIn: PRESIGN_GET_EXPIRY_SECONDS });
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: `${AVATAR_PREFIX}${key}` }));
    } catch (error) {
      this.logger.warn(`Failed to delete storage object ${key}: ${error}`);
    }
  }

  async presignFileUpload(
    contentType: string,
    fileName: string,
    ownerId: string,
  ): Promise<PresignedAvatarUpload> {
    const ext = extname(fileName).slice(1).replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "bin";
    const key = `${ownerId}_${randomUUID()}.${ext}`;

    const { url, fields } = await createPresignedPost(this.client, {
      Bucket: this.bucket,
      Key: `${ATTACHMENT_PREFIX}${key}`,
      Conditions: [
        ["content-length-range", 0, MAX_ATTACHMENT_UPLOAD_BYTES],
        { "Content-Type": contentType },
      ],
      Fields: { "Content-Type": contentType },
      Expires: PRESIGN_EXPIRY_SECONDS,
    });

    return { url, fields, key };
  }

  async presignFileGet(key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: `${ATTACHMENT_PREFIX}${key}` });
    return getSignedUrl(this.client, command, { expiresIn: PRESIGN_GET_EXPIRY_SECONDS });
  }

  async deleteFileObject(key: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: `${ATTACHMENT_PREFIX}${key}` }));
    } catch (error) {
      this.logger.warn(`Failed to delete storage object ${key}: ${error}`);
    }
  }
}
