import { BadRequestException } from "@nestjs/common";
import { assertPublicUrl, isPublicIP } from "./assert-public-url";
import dns from "dns";

jest.mock("dns", () => ({
  promises: {
    lookup: jest.fn(),
  },
}));

describe("assertPublicUrl (Cluster 2 SSRF guard)", () => {
  describe("scheme validation", () => {
    it.each([
      "ftp://example.com/file",
      "file:///etc/passwd",
      "javascript:alert(1)",
      "data:text/html,test",
      "gopher://example.com",
    ])("rejects non-http(s) scheme: %s", async (url) => {
      await expect(assertPublicUrl(url)).rejects.toThrow(BadRequestException);
    });

    it("rejects invalid malformed URLs", async () => {
      await expect(assertPublicUrl("not-a-url")).rejects.toThrow(BadRequestException);
    });
  });

  describe("direct IP literal validation", () => {
    it.each([
      ["http://127.0.0.1:8080", "127.0.0.1 (Loopback)"],
      ["http://10.0.0.1/admin", "10.0.0.1 (Private Class A)"],
      ["http://172.16.0.1/status", "172.16.0.1 (Private Class B)"],
      ["http://172.31.255.255", "172.31.255.255 (Private Class B top)"],
      ["http://192.168.1.1/router", "192.168.1.1 (Private Class C)"],
      ["http://169.254.169.254/latest/meta-data", "169.254.169.254 (Cloud metadata / Link-local)"],
      ["http://0.0.0.0:3000", "0.0.0.0 (Current network)"],
      ["http://100.64.0.1", "100.64.0.1 (Carrier-grade NAT)"],
      ["http://192.0.2.1", "192.0.2.1 (TEST-NET-1)"],
      ["http://198.51.100.1", "198.51.100.1 (TEST-NET-2)"],
      ["http://203.0.113.1", "203.0.113.1 (TEST-NET-3)"],
      ["http://224.0.0.1", "224.0.0.1 (Multicast)"],
      ["http://255.255.255.255", "255.255.255.255 (Broadcast)"],
      ["http://[::1]", "::1 (IPv6 Loopback)"],
      ["http://[fc00::1]", "fc00::1 (IPv6 Unique Local)"],
      ["http://[fd12:3456:789a::1]", "fd00::/8 (IPv6 Unique Local)"],
      ["http://[fe80::1]", "fe80::1 (IPv6 Link-local)"],
      ["http://[ff02::1]", "ff02::1 (IPv6 Multicast)"],
      ["http://[::ffff:127.0.0.1]", "::ffff:127.0.0.1 (IPv4-mapped Loopback)"],
      ["http://[::ffff:10.0.0.1]", "::ffff:10.0.0.1 (IPv4-mapped Private)"],
      ["http://[::ffff:169.254.169.254]", "::ffff:169.254.169.254 (IPv4-mapped Metadata)"],
    ])("rejects private/reserved IP: %s (%s)", async (url) => {
      await expect(assertPublicUrl(url)).rejects.toThrow(BadRequestException);
    });

    it.each([
      "http://8.8.8.8",
      "https://1.1.1.1/dns-query",
      "http://93.184.216.34:80",
    ])("allows direct public IPv4: %s", async (url) => {
      await expect(assertPublicUrl(url)).resolves.toBeUndefined();
    });
  });

  describe("hostname resolution checks", () => {
    it("rejects localhost hostname before DNS resolution", async () => {
      await expect(assertPublicUrl("http://localhost:3000")).rejects.toThrow(BadRequestException);
      await expect(assertPublicUrl("http://sub.localhost")).rejects.toThrow(BadRequestException);
    });

    it("rejects a public-looking domain that resolves to a private IP (DNS rebinding / SSRF pivot)", async () => {
      (dns.promises.lookup as jest.Mock).mockResolvedValueOnce([
        { address: "169.254.169.254", family: 4 },
      ]);

      await expect(assertPublicUrl("https://attacker-domain.com")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("rejects a domain that resolves to loopback IP 127.0.0.1", async () => {
      (dns.promises.lookup as jest.Mock).mockResolvedValueOnce([
        { address: "127.0.0.1", family: 4 },
      ]);

      await expect(assertPublicUrl("https://local-resolver.com")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("rejects a domain if ANY of its multiple resolved IPs is private", async () => {
      (dns.promises.lookup as jest.Mock).mockResolvedValueOnce([
        { address: "93.184.216.34", family: 4 },
        { address: "10.0.0.2", family: 4 },
      ]);

      await expect(assertPublicUrl("https://dual-homed.com")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("allows a domain that resolves strictly to public IPs", async () => {
      (dns.promises.lookup as jest.Mock).mockResolvedValueOnce([
        { address: "93.184.216.34", family: 4 },
      ]);

      await expect(assertPublicUrl("https://example.com")).resolves.toBeUndefined();
    });
  });

  describe("isPublicIP helper", () => {
    it("identifies public and non-public IPs correctly", () => {
      expect(isPublicIP("8.8.8.8")).toBe(true);
      expect(isPublicIP("1.1.1.1")).toBe(true);
      expect(isPublicIP("127.0.0.1")).toBe(false);
      expect(isPublicIP("10.10.10.10")).toBe(false);
      expect(isPublicIP("192.168.0.1")).toBe(false);
      expect(isPublicIP("172.20.0.1")).toBe(false);
      expect(isPublicIP("169.254.169.254")).toBe(false);
      expect(isPublicIP("::1")).toBe(false);
      expect(isPublicIP("not-an-ip")).toBe(false);
    });
  });
});
