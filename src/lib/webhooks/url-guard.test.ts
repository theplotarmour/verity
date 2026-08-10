import { describe, it, expect } from "vitest";
import { checkWebhookUrl, isBlockedAddress } from "./url-guard";

/**
 * SSRF guard.
 *
 * Webhook URLs are tenant-supplied, so every delivery is an authenticated
 * outbound request to an address we do not control. The failure mode is not
 * subtle: `http://169.254.169.254/latest/meta-data/iam/security-credentials/`
 * returns cloud credentials to anyone who can persuade us to fetch it.
 *
 * Written as a table because the value of this guard is entirely in its
 * coverage of ranges — a guard that blocks 127.0.0.1 and misses 169.254.169.254
 * is worse than none, since it looks like protection.
 */

describe("isBlockedAddress", () => {
  it.each([
    ["127.0.0.1", "loopback"],
    ["127.1.2.3", "loopback, whole /8"],
    ["10.0.0.1", "RFC1918"],
    ["172.16.0.1", "RFC1918 lower bound"],
    ["172.31.255.255", "RFC1918 upper bound"],
    ["192.168.1.1", "RFC1918"],
    ["169.254.169.254", "cloud metadata — the one that matters"],
    ["0.0.0.0", "this network"],
    ["100.64.0.1", "carrier-grade NAT"],
    ["224.0.0.1", "multicast"],
    ["255.255.255.255", "broadcast"],
    ["::1", "IPv6 loopback"],
    ["fe80::1", "IPv6 link-local"],
    ["fc00::1", "IPv6 unique local"],
    ["fd12:3456::1", "IPv6 unique local"],
    ["::ffff:169.254.169.254", "IPv4-mapped metadata address"],
    ["::ffff:127.0.0.1", "IPv4-mapped loopback"],
    ["not-an-ip", "unparseable — refuse rather than guess"],
  ])("blocks %s (%s)", (ip) => {
    expect(isBlockedAddress(ip)).toBe(true);
  });

  it.each([
    ["8.8.8.8"],
    ["1.1.1.1"],
    ["172.32.0.1"], // just outside RFC1918 — the off-by-one
    ["172.15.255.255"], // just below it
    ["93.184.216.34"],
    ["2606:4700::1111"],
  ])("allows public address %s", (ip) => {
    expect(isBlockedAddress(ip)).toBe(false);
  });
});

describe("checkWebhookUrl", () => {
  it("accepts an ordinary https endpoint", () => {
    const verdict = checkWebhookUrl("https://shop.example.com/hooks/verity");
    expect(verdict.ok).toBe(true);
  });

  it.each([
    ["file:///etc/passwd", "non-http scheme"],
    ["gopher://example.com/", "non-http scheme"],
    ["ftp://example.com/x", "non-http scheme"],
  ])("refuses %s (%s)", (url) => {
    expect(checkWebhookUrl(url).ok).toBe(false);
  });

  it("refuses a literal private address without needing DNS", () => {
    expect(checkWebhookUrl("http://169.254.169.254/latest/meta-data/").ok).toBe(false);
    expect(checkWebhookUrl("http://127.0.0.1:3000/hook").ok).toBe(false);
    expect(checkWebhookUrl("http://[::1]/hook").ok).toBe(false);
  });

  it("refuses localhost and internal suffixes by name", () => {
    expect(checkWebhookUrl("http://localhost/hook").ok).toBe(false);
    expect(checkWebhookUrl("http://db.internal/hook").ok).toBe(false);
  });

  it("refuses credentials embedded in the URL", () => {
    // These end up in logs, and they are a common way to smuggle a different
    // host past a naive parser.
    expect(checkWebhookUrl("https://user:pass@example.com/hook").ok).toBe(false);
  });

  it("gives a reason, not just a refusal", () => {
    const verdict = checkWebhookUrl("http://10.0.0.5/hook");
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toMatch(/private|reserved/i);
  });

  it("rejects a malformed URL rather than throwing", () => {
    expect(checkWebhookUrl("not a url at all").ok).toBe(false);
    expect(checkWebhookUrl("").ok).toBe(false);
  });
});
