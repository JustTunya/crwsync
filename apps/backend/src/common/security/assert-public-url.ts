import { BadRequestException } from "@nestjs/common";
import dns from "dns";
import net from "net";

/**
 * Checks whether an IPv4 address (as a 32-bit unsigned number) falls within private or reserved ranges.
 */
function isPrivateOrReservedIPv4(ip: string): boolean {
  const octets = ip.split(".").map(Number);
  if (octets.length !== 4 || octets.some((o) => isNaN(o) || o < 0 || o > 255)) {
    return true;
  }

  const num = ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;

  // 0.0.0.0/8 (Current network)
  if (num >= 0x00000000 && num <= 0x00ffffff) return true;
  // 10.0.0.0/8 (Private)
  if (num >= 0x0a000000 && num <= 0x0affffff) return true;
  // 100.64.0.0/10 (Carrier-grade NAT)
  if (num >= 0x64400000 && num <= 0x647fffff) return true;
  // 127.0.0.0/8 (Loopback)
  if (num >= 0x7f000000 && num <= 0x7fffffff) return true;
  // 169.254.0.0/16 (Link-local, incl. cloud metadata 169.254.169.254)
  if (num >= 0xa9fe0000 && num <= 0xa9feffff) return true;
  // 172.16.0.0/12 (Private: 172.16.0.0 - 172.31.255.255)
  if (num >= 0xac100000 && num <= 0xac1fffff) return true;
  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (num >= 0xc0000000 && num <= 0xc00000ff) return true;
  // 192.0.2.0/24 (TEST-NET-1)
  if (num >= 0xc0000200 && num <= 0xc00002ff) return true;
  // 192.168.0.0/16 (Private)
  if (num >= 0xc0a80000 && num <= 0xc0a8ffff) return true;
  // 198.18.0.0/15 (Benchmarking)
  if (num >= 0xc6120000 && num <= 0xc613ffff) return true;
  // 198.51.100.0/24 (TEST-NET-2)
  if (num >= 0xc6336400 && num <= 0xc63364ff) return true;
  // 203.0.113.0/24 (TEST-NET-3)
  if (num >= 0xcb007100 && num <= 0xcb0071ff) return true;
  // 224.0.0.0/4 (Multicast)
  if (num >= 0xe0000000 && num <= 0xefffffff) return true;
  // 240.0.0.0/4 (Reserved / Broadcast 255.255.255.255)
  if (num >= 0xf0000000 && num <= 0xffffffff) return true;

  return false;
}

/**
 * Checks whether an IPv6 address falls within private, loopback, or reserved ranges.
 */
function isPrivateOrReservedIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();

  // IPv4-mapped IPv6: ::ffff:192.168.1.1 or ::ffff:c0a8:0101
  if (lower.startsWith("::ffff:")) {
    const rest = lower.slice(7);
    if (net.isIPv4(rest)) {
      return isPrivateOrReservedIPv4(rest);
    }
  }

  // Unspecified :: and Loopback ::1
  if (lower === "::" || lower === "::1" || lower === "0:0:0:0:0:0:0:0" || lower === "0:0:0:0:0:0:0:1") {
    return true;
  }

  // Unique Local Address (fc00::/7 -> fc.. and fd..)
  if (lower.startsWith("fc") || lower.startsWith("fd")) {
    return true;
  }

  // Link-local unicast (fe80::/10 -> fe8.., fe9.., fea.., feb..)
  if (/^fe[89ab]/i.test(lower)) {
    return true;
  }

  // Multicast (ff00::/8)
  if (lower.startsWith("ff")) {
    return true;
  }

  // NAT64 (64:ff9b::/96)
  if (lower.startsWith("64:ff9b:")) {
    return true;
  }

  // Documentation (2001:db8::/32)
  if (lower.startsWith("2001:db8:") || lower.startsWith("2001:0db8:")) {
    return true;
  }

  return false;
}

/**
 * Validates that an IP address is a publicly routable address.
 */
export function isPublicIP(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) {
    return !isPrivateOrReservedIPv4(ip);
  }
  if (version === 6) {
    return !isPrivateOrReservedIPv6(ip);
  }
  return false;
}

/**
 * Validates that a raw URL uses http(s) and resolves only to public, non-private IP addresses.
 * Throws BadRequestException if the scheme is not http(s), the hostname cannot be resolved,
 * or if any resolved IP belongs to a private/loopback/link-local/reserved range.
 */
export async function assertPublicUrl(rawUrl: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new BadRequestException("Invalid URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new BadRequestException("Only HTTP and HTTPS URLs are permitted");
  }

  const hostname = parsed.hostname;
  if (!hostname) {
    throw new BadRequestException("URL hostname is required");
  }

  // If hostname is already a direct IP literal
  if (net.isIP(hostname)) {
    if (!isPublicIP(hostname)) {
      throw new BadRequestException("Requests to private or reserved IP addresses are forbidden");
    }
    return;
  }

  // Reject obvious localhost / loopback string patterns even before DNS
  if (hostname.toLowerCase() === "localhost" || hostname.toLowerCase().endsWith(".localhost")) {
    throw new BadRequestException("Requests to localhost are forbidden");
  }

  // Resolve hostname via DNS
  let addresses: dns.LookupAddress[];
  try {
    addresses = await dns.promises.lookup(hostname, { all: true });
  } catch (err: unknown) {
    throw new BadRequestException(`Could not resolve hostname: ${(err as Error).message}`);
  }

  if (!addresses || addresses.length === 0) {
    throw new BadRequestException("Hostname could not be resolved");
  }

  for (const { address } of addresses) {
    if (!isPublicIP(address)) {
      throw new BadRequestException("Requests to private or reserved IP addresses are forbidden");
    }
  }
}
