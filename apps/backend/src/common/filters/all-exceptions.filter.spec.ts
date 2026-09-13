import { HttpException, HttpStatus } from "@nestjs/common";
import * as Sentry from "@sentry/nestjs";
import { AllExceptionsFilter } from "./all-exceptions.filter";

jest.mock("@sentry/nestjs", () => ({ captureException: jest.fn() }));

function makeHost(req: { method: string; url: string }) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status };
  const host = {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
  };
  return { host: host as any, status };
}

describe("AllExceptionsFilter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reports an unexpected 500-class error to Sentry", () => {
    const filter = new AllExceptionsFilter();
    const { host, status } = makeHost({ method: "GET", url: "/boom" });

    filter.catch(new Error("boom"), host);

    expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(Error));
    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it("does not report an expected 4xx HttpException to Sentry", () => {
    const filter = new AllExceptionsFilter();
    const { host, status } = makeHost({ method: "POST", url: "/login" });

    filter.catch(new HttpException("Invalid credentials", HttpStatus.UNAUTHORIZED), host);

    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
  });
});
