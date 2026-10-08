import { NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AiEnabledGuard } from "./ai-enabled.guard";

describe("AiEnabledGuard", () => {
  const guardFor = (value?: string) => new AiEnabledGuard({ get: () => value } as unknown as ConfigService);

  it("allows requests when AI_ENABLED=true", () => {
    expect(guardFor("true").canActivate()).toBe(true);
  });

  it.each([undefined, "false", "", "1"])("answers 404 when AI_ENABLED is %p", (value) => {
    expect(() => guardFor(value).canActivate()).toThrow(NotFoundException);
  });
});
