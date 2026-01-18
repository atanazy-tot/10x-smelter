import { createHash } from "crypto";

/**
 * Hashes an IP address using SHA-256 for anonymous user tracking.
 * Original IP is never stored - only the hash.
 */
export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}
