import { ConfigService } from "@nestjs/config";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { StorageService } from "./storage.service";

jest.mock("@aws-sdk/s3-presigned-post");

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
    (createPresignedPost as jest.Mock).mockResolvedValue({
      url: "http://test-bucket:9000/test-bucket",
      fields: { "Content-Type": "image/png" },
    });
    service = new StorageService(config);
  });

  it("rejects unsupported content types", async () => {
    await expect(service.presignAvatarUpload("application/pdf")).rejects.toThrow("Unsupported image type");
  });

  it("returns a presigned POST with a UUID key ending in the correct extension", async () => {
    const result = await service.presignAvatarUpload("image/png");

    expect(result.key).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(result.url).toContain("test-bucket");
    expect(result.fields["Content-Type"]).toBe("image/png");

    expect(createPresignedPost).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        Conditions: expect.arrayContaining([
          ["content-length-range", 0, 5242880],
          { "Content-Type": "image/png" },
        ]),
      }),
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
});
