import { lookup } from "node:dns/promises";
import net from "node:net";

/**
 * SSRF guard for outbound webhooks.
 *
 * A webhook URL is supplied by the tenant, which makes every delivery an
 * authenticated outbound request to an address we do not control. Unchecked,
 * "https://my-shop.example/hook" and "http://169.254.169.254/latest/meta-data/"
 * are the same feature — the second one reads the cloud metadata service and
 * hands back credentials, from inside our own network.
 *
 * Checked twice on purpose: when the endpoint is saved, and again immediately
 * before each delivery. A name that resolved publicly at save time can be
 * repointed at 127.0.0.1 later, and only the second check catches that.
 */

/** Ranges that are never a legitimate customer webhook target. */
function isBlockedIPv4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  if (a === 0) return true; // "this" network
  if (a === 10) return true; // RFC1918
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local — cloud metadata lives here
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
  if (a === 192 && b === 168) return true; // RFC1918
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a === 192 && b === 0) return true; // IETF protocol assignments
  if (a >= 224) return true; // multicast and reserved
  return false;
}

function isBlockedIPv6(ip: string): boolean {
  const normalised = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (normalised === "::1" || normalised === "::") return true; // loopback, unspecified
  if (normalised.startsWith("fe80")) return true; // link-local
  if (/^f[cd]/.test(normalised)) return true; // unique local
  if (normalised.startsWith("ff")) return true; // multicast

  // IPv4-mapped (::ffff:169.254.169.254) would otherwise walk straight past the
  // IPv4 rules above.
  const mapped = normalised.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIPv4(mapped[1]);

  return false;
}

export function isBlockedAddress(ip: string): boolean {
  if (net.isIPv4(ip)) return isBlockedIPv4(ip);
  if (net.isIPv6(ip)) return isBlockedIPv6(ip);
  return true; // not an address we can reason about — refuse
}

export type UrlVerdict = { ok: true; url: URL } | { ok: false; reason: string };

/**
 * Shape-only checks. Synchronous, so form validation can use it without a DNS
 * round trip; `assertDeliverable` is the one that resolves.
 */
export function checkWebhookUrl(raw: string): UrlVerdict {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "Not a valid URL." };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    // file:, gopher: and friends are how an SSRF becomes a local file read.
    return { ok: false, reason: "Only http and https URLs are allowed." };
  }

  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    return { ok: false, reason: "Webhook URLs must use https." };
  }

  if (url.username || url.password) {
    return { ok: false, reason: "Credentials in the URL are not allowed." };
  }

  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
    return { ok: false, reason: "That host is not reachable from the internet." };
  }

  // A literal IP skips DNS entirely, so judge it here.
  if (net.isIP(host) && isBlockedAddress(host)) {
    return { ok: false, reason: "That address is in a private or reserved range." };
  }

  return { ok: true, url };
}

/**
 * The full check, including DNS. Call this immediately before delivering.
 *
 * This still leaves a TOCTOU gap — the name could change between this lookup and
 * the socket connect. Closing it entirely means pinning the resolved address
 * into the request, which Node's fetch does not expose. Given deliveries are
 * outbound-only and the response body is discarded, the residual risk is a blind
 * request rather than a data read, and this check removes the useful cases.
 */
export async function assertDeliverable(raw: string): Promise<UrlVerdict> {
  const shape = checkWebhookUrl(raw);
  if (!shape.ok) return shape;

  const host = shape.url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host)) return shape; // already judged, no DNS to do

  try {
    const results = await lookup(host, { all: true });
    if (results.length === 0) {
      return { ok: false, reason: "That host does not resolve." };
    }
    // Every answer must be acceptable. A name resolving to one public and one
    // private address is a DNS-rebinding attempt, not a misconfiguration.
    for (const { address } of results) {
      if (isBlockedAddress(address)) {
        return { ok: false, reason: "That host resolves to a private or reserved address." };
      }
    }
  } catch {
    return { ok: false, reason: "That host does not resolve." };
  }

  return shape;
}
