import { IsMemberGuard } from "src/workspace/guards/ws-member.guard";
import { AiController } from "./ai.controller";
import { AiEnabledGuard } from "./ai-enabled.guard";

describe("AiController wiring", () => {
  it("checks the feature flag before workspace membership", () => {
    expect(Reflect.getMetadata("__guards__", AiController)).toEqual([AiEnabledGuard, IsMemberGuard]);
  });

  it.each(["summarizeRoom", "draftTasks", "digestBoard", "standup"] as const)("throttles %s to 10 per minute", (method) => {
    const handler = AiController.prototype[method];

    expect(Reflect.getMetadata("THROTTLER:LIMITdefault", handler)).toBe(10);
    expect(Reflect.getMetadata("THROTTLER:TTLdefault", handler)).toBe(60000);
  });

  it("leaves job polling unthrottled", () => {
    expect(Reflect.getMetadata("THROTTLER:SKIPdefault", AiController.prototype.getJob)).toBe(true);
  });
});
