import { Prisma } from "@prisma/client";
import { WaitlistService } from "./waitlist.service";
import { PrismaService } from "src/prisma/prisma.service";

describe("WaitlistService", () => {
  let service: WaitlistService;
  let prisma: { waitlistEntry: { create: jest.Mock } };

  beforeEach(() => {
    prisma = { waitlistEntry: { create: jest.fn().mockResolvedValue({}) } };
    service = new WaitlistService(prisma as unknown as PrismaService);
  });

  it("stores only the collected fields", async () => {
    await service.join({ email: "a@example.com", team_size: "2-5", use_case: " boards " });

    expect(prisma.waitlistEntry.create).toHaveBeenCalledWith({
      data: { email: "a@example.com", team_size: "2-5", use_case: "boards" },
    });
  });

  it("stores a null use case when none is given", async () => {
    await service.join({ email: "a@example.com", team_size: "1" });

    expect(prisma.waitlistEntry.create).toHaveBeenCalledWith({
      data: { email: "a@example.com", team_size: "1", use_case: null },
    });
  });

  it("treats a duplicate email as success", async () => {
    prisma.waitlistEntry.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "7" }),
    );

    await expect(service.join({ email: "a@example.com", team_size: "1" })).resolves.toBeUndefined();
  });

  it("rethrows other database errors", async () => {
    prisma.waitlistEntry.create.mockRejectedValue(new Error("db down"));

    await expect(service.join({ email: "a@example.com", team_size: "1" })).rejects.toThrow("db down");
  });
});
