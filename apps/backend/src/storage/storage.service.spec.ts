import { ConfigService } from "@nestjs/config";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { StorageService } from "./storage.service";

jest.mock("@aws-sdk/s3-request-presigner");

describe("StorageService", () => {
  let service: StorageService;

  const values: Record<string, string> = {
    STORAGE_BUCKET: "test-bucket",
    STORAGE_ENDPOINT: "http://localhost:9000",
    STORAGE_REGION: "us-east-1",
    STORAGE_ACCESS_KEY: "test-access-key",
    STORAGE_SECRET_KEY: "test-secret-key",
  };

  const config = {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    (getSignedUrl as jest.Mock).mockImplementation(
      async (_client: unknown, command: { input: { Key: string } }) =>
        `http://test-bucket:9000/test-bucket/${command.input.Key}`,
    );
    service = new StorageService(config);
  });

  it("rejects unsupported content types", async () => {
    await expect(service.presignAvatarUpload("application/pdf", "test-user-id")).rejects.toThrow("Unsupported image type");
  });

  it("returns a presigned PUT url with a UUID key ending in the correct extension", async () => {
    const result = await service.presignAvatarUpload("image/png", "test-user-id");

    expect(result.key).toMatch(/^test-user-id_[0-9a-f-]{36}\.png$/);
    expect(result.url).toContain("test-bucket");

    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ input: expect.objectContaining({ ContentType: "image/png" }) }),
      expect.objectContaining({ expiresIn: 300 }),
    );
  });

  it("returns a presigned GET url containing the key", async () => {
    const url = await service.presignGet("abc123.png");
    expect(url).toContain("abc123.png");
  });

  it("deletes an object by key, swallowing errors", async () => {
    const send = jest.fn().mockRejectedValue(new Error("network down"));
    (service as unknown as { client: { send: typeof send } }).client = { send };

    await expect(service.deleteObject("some-key.png")).resolves.toBeUndefined();
    expect(send).toHaveBeenCalled();
  });

  describe("onModuleInit", () => {
    it("checks existing bucket without creating", async () => {
      const send = jest.fn().mockResolvedValue({});
      (service as unknown as { client: { send: typeof send } }).client = { send };

      await service.onModuleInit();
      expect(send).toHaveBeenCalledTimes(1);
    });

    it("creates bucket if head bucket fails", async () => {
      const send = jest.fn().mockRejectedValueOnce(new Error("not found")).mockResolvedValueOnce({});
      (service as unknown as { client: { send: typeof send } }).client = { send };

      await service.onModuleInit();
      expect(send).toHaveBeenCalledTimes(2);
    });

    it("handles bucket creation error gracefully", async () => {
      const send = jest.fn().mockRejectedValue(new Error("create failed"));
      (service as unknown as { client: { send: typeof send } }).client = { send };

      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });
  });

  describe("file attachments", () => {
    it("presigns file upload with file extension", async () => {
      const result = await service.presignFileUpload("application/pdf", "document.pdf", "user-1");
      expect(result.key).toMatch(/^user-1_[0-9a-f-]{36}\.pdf$/);
      expect(result.url).toContain("test-bucket");
    });

    it("presigns file upload with fallback extension when no ext found", async () => {
      const result = await service.presignFileUpload("application/octet-stream", "noextension", "user-1");
      expect(result.key).toMatch(/^user-1_[0-9a-f-]{36}\.bin$/);
    });

    it("returns a presigned GET url for files", async () => {
      const url = await service.presignFileGet("attachment-key.pdf");
      expect(url).toContain("attachment-key.pdf");
    });

    it("deletes file object by key and swallows errors", async () => {
      const send = jest.fn().mockRejectedValue(new Error("delete file error"));
      (service as unknown as { client: { send: typeof send } }).client = { send };

      await expect(service.deleteFileObject("attachment-key.pdf")).resolves.toBeUndefined();
      expect(send).toHaveBeenCalled();
    });
  });
});
