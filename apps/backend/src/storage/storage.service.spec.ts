import { ConfigService } from "@nestjs/config";
import { StorageService } from "./storage.service";

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
